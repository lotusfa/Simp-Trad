/**
 * Client-side text / Markdown / EPUB helpers for 簡繁轉換.
 * EPUB = ZIP; convert text inside markup files, keep structure.
 */

const TEXT_EXTS = new Set([
  // plain / docs
  'txt', 'text', 'md', 'markdown', 'rst', 'adoc', 'asciidoc', 'org', 'tex', 'ltx', 'bib', 'nfo',
  // data / config
  'csv', 'tsv', 'json', 'jsonl', 'ndjson', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'properties', 'env',
  // markup
  'html', 'htm', 'xhtml', 'xml', 'svg', 'rss', 'atom',
  // subtitles / captions / lyrics
  'srt', 'vtt', 'ass', 'ssa', 'sub', 'sbv', 'lrc', 'ttml', 'dfxp',
  // code / logs / misc text
  'log', 'sql', 'diff', 'patch', 'po', 'pot', 'xliff', 'xlf',
  'css', 'scss', 'less', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'r', 'm', 'php', 'pl', 'lua',
  'vue', 'svelte', 'astro',
]);

/** Extensions we refuse (binary / structured docs we cannot safely convert as plain text). */
const REJECT_EXTS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
  'zip', 'rar', '7z', 'gz', 'bz2', 'xz', 'tar',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tif', 'tiff', 'heic',
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'mp4', 'mov', 'mkv', 'avi', 'webm',
  'exe', 'dmg', 'apk', 'wasm', 'bin', 'dat', 'sqlite', 'db',
]);
const MARKUP_EXTS = new Set(['html', 'htm', 'xhtml', 'xml', 'ncx', 'opf', 'svg']);
const EPUB_TEXT_EXTS = new Set(['xhtml', 'html', 'htm', 'xml', 'ncx', 'opf', 'txt', 'css']);

export function fileExt(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function isEpubFile(file) {
  const n = (file.name || '').toLowerCase();
  return n.endsWith('.epub') || file.type === 'application/epub+zip';
}

export function isRejectedBinaryFile(file) {
  const ext = fileExt(file.name);
  if (ext === 'epub') return false;
  return REJECT_EXTS.has(ext);
}

export function isSupportedTextFile(file) {
  const ext = fileExt(file.name);
  if (isRejectedBinaryFile(file)) return false;
  // Known text ext, text/* MIME, or unknown ext we still try as UTF-8 text
  // (picker may allow *; drop often has empty type).
  return (
    TEXT_EXTS.has(ext) ||
    (file.type || '').startsWith('text/') ||
    (file.type || '') === 'application/json' ||
    (file.type || '') === 'application/xml' ||
    (file.type || '') === 'application/javascript' ||
    !ext
  );
}

/** MIME for download blob; keep common types useful for OS "Open with". */
export function mimeForExt(ext) {
  const e = (ext || '').toLowerCase();
  const map = {
    csv: 'text/csv;charset=utf-8',
    tsv: 'text/tab-separated-values;charset=utf-8',
    json: 'application/json;charset=utf-8',
    jsonl: 'application/x-ndjson;charset=utf-8',
    ndjson: 'application/x-ndjson;charset=utf-8',
    html: 'text/html;charset=utf-8',
    htm: 'text/html;charset=utf-8',
    xhtml: 'application/xhtml+xml;charset=utf-8',
    xml: 'application/xml;charset=utf-8',
    svg: 'image/svg+xml;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    markdown: 'text/markdown;charset=utf-8',
    css: 'text/css;charset=utf-8',
    js: 'text/javascript;charset=utf-8',
    mjs: 'text/javascript;charset=utf-8',
    cjs: 'text/javascript;charset=utf-8',
    srt: 'application/x-subrip;charset=utf-8',
    vtt: 'text/vtt;charset=utf-8',
    yaml: 'application/yaml;charset=utf-8',
    yml: 'application/yaml;charset=utf-8',
  };
  return map[e] || 'text/plain;charset=utf-8';
}

export function suggestedDownloadName(originalName, direction, forceExt) {
  const tag = direction === 't2s' ? 'simp' : 'trad';
  const name = originalName || 'converted.txt';
  const ext = forceExt || fileExt(name) || 'txt';
  const base = name.replace(/\.[^.]+$/, '') || 'converted';
  return `${base}_${tag}.${ext}`;
}

/** Convert text nodes only; leave tags / entities structure alone. */
export function convertMarkupPreservingTags(markup, converter) {
  return String(markup).replace(/(^|>)([^<]*)/g, (_, edge, text) => edge + converter(text));
}

export function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function readPlainFile(file) {
  return await file.text();
}

/**
 * @param {ArrayBuffer} buf
 * @param {(s: string) => string} converter
 * @param {typeof JSZip} JSZip
 */
export async function convertEpub(buf, converter, JSZip) {
  const zip = await JSZip.loadAsync(buf);
  const previews = [];
  const jobs = [];

  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const ext = fileExt(path);
    if (!EPUB_TEXT_EXTS.has(ext)) return;
    jobs.push((async () => {
      const original = await entry.async('string');
      let converted;
      if (ext === 'txt') {
        converted = converter(original);
      } else if (ext === 'css') {
        // Only convert non-ASCII runs in CSS (comments / content strings may be Chinese)
        converted = original.replace(/[^\x00-\x7F]+/g, (chunk) => converter(chunk));
      } else {
        converted = convertMarkupPreservingTags(original, converter);
      }
      zip.file(path, converted);
      if (MARKUP_EXTS.has(ext) || ext === 'txt') {
        const plain = stripTags(converted);
        if (plain) previews.push(plain);
      }
    })());
  });

  await Promise.all(jobs);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });
  const previewText = previews.join('\n\n').slice(0, 20000);
  return { blob, previewText, fileCount: jobs.length };
}
