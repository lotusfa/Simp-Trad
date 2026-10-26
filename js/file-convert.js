/**
 * Client-side text / Markdown / EPUB helpers for 簡繁轉換.
 * EPUB = ZIP; convert text inside markup files, keep structure.
 */

const TEXT_EXTS = new Set([
  'txt', 'text', 'md', 'markdown', 'csv', 'tsv', 'json', 'html', 'htm', 'xml', 'log', 'srt', 'vtt', 'yaml', 'yml',
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

export function isSupportedTextFile(file) {
  const ext = fileExt(file.name);
  return TEXT_EXTS.has(ext) || (file.type || '').startsWith('text/');
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
