/**
 * File convert panel: footer「文件」opens modal with drag-drop + job list.
 */
import {
  isEpubFile,
  suggestedDownloadName,
  convertMarkupPreservingTags,
  convertEpub,
  readPlainFile,
  fileExt,
} from './file-convert.js';

export function initFileUI({
  getConverter,
  selected,
  inputText,
  outputText,
  downloadBtn,
  svgUpload,
  svgDownload,
  svgCopy,
}) {
  const filesBtn = document.getElementById('filesBtn');
  const fileModal = document.getElementById('fileModal');
  const fileModalClose = document.getElementById('fileModalClose');
  const fileDropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('inputFile');
  const fileListEl = document.getElementById('fileList');
  const fileNameSpan = document.getElementById('fileName');

  const svgClose = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  const svgOpen = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v7H3V3h7"/></svg>`;

  filesBtn.innerHTML = svgUpload + '<span class="tools-label">文件</span>';
  fileModalClose.innerHTML = svgClose;
  downloadBtn.innerHTML = svgDownload;

  const fileJobs = new Map();
  let activeJobId = null;
  let queue = Promise.resolve();

  function converter() {
    return getConverter();
  }

  function updateDownloadState() {
    const job = activeJobId ? fileJobs.get(activeJobId) : null;
    downloadBtn.disabled = !(job && job.status === 'done' && job.blob) && !outputText.value;
  }

  function openModal() {
    fileModal.hidden = false;
    fileModal.classList.add('open');
  }
  function closeModal() {
    fileModal.classList.remove('open');
    fileModal.hidden = true;
  }

  filesBtn.addEventListener('click', openModal);
  fileModalClose.addEventListener('click', closeModal);
  fileModal.addEventListener('click', (e) => {
    if (e.target === fileModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fileModal.classList.contains('open')) closeModal();
  });

  fileDropzone.addEventListener('click', () => fileInput.click());
  fileDropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach((ev) => {
    fileDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    fileDropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
    });
  });
  fileDropzone.addEventListener('drop', (e) => {
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) enqueueFiles(files);
  });
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = '';
    if (files.length) enqueueFiles(files);
  });

  function setProgress(job, pct, statusText, statusClass) {
    job.progress = pct;
    if (!job.row) return;
    job.row.querySelector('.progress > span').style.width = `${pct}%`;
    const st = job.row.querySelector('.file-item-status');
    st.textContent = statusText;
    st.className = 'file-item-status' + (statusClass ? ` ${statusClass}` : '');
  }

  function renderJobRow(job) {
    const row = document.createElement('div');
    row.className = 'file-item';
    row.innerHTML = `
      <div class="file-item-top">
        <div class="file-item-name"></div>
        <div class="file-item-status">排隊中</div>
      </div>
      <div class="progress" aria-hidden="true"><span></span></div>
      <div class="file-item-actions" hidden>
        <button type="button" class="btn-icon btn-open" aria-label="Open" title="Open"></button>
        <button type="button" class="btn-icon btn-dl" aria-label="Download" title="Download"></button>
      </div>`;
    row.querySelector('.file-item-name').textContent = job.name;
    row.querySelector('.btn-open').innerHTML = svgOpen;
    row.querySelector('.btn-dl').innerHTML = svgDownload;
    row.querySelector('.btn-open').addEventListener('click', () => openJob(job.id));
    row.querySelector('.btn-dl').addEventListener('click', () => downloadJob(job.id));
    fileListEl.prepend(row);
    job.row = row;
  }

  function enqueueFiles(files) {
    openModal();
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const job = {
        id,
        file,
        name: file.name,
        status: 'queued',
        blob: null,
        preview: '',
        downloadName: '',
        kind: 'text',
        row: null,
      };
      fileJobs.set(id, job);
      renderJobRow(job);
      queue = queue.then(() => processJob(id));
    }
  }

  async function processJob(id) {
    const job = fileJobs.get(id);
    if (!job) return;
    job.status = 'running';
    setProgress(job, 8, '開始…');
    const direction = selected('direction') || 's2t';
    const conv = converter();
    try {
      if (isEpubFile(job.file)) {
        if (typeof JSZip === 'undefined') throw new Error('JSZip missing');
        setProgress(job, 20, '讀取 EPUB…');
        const buf = await job.file.arrayBuffer();
        setProgress(job, 45, '轉換中…');
        const { blob, previewText, fileCount } = await convertEpub(buf, conv, JSZip);
        job.blob = blob;
        job.preview = previewText || '';
        job.kind = 'epub';
        job.downloadName = suggestedDownloadName(job.name, direction, 'epub');
        setProgress(job, 100, `完成 · ${fileCount} 個檔`, 'done');
      } else {
        setProgress(job, 25, '讀取中…');
        const raw = await readPlainFile(job.file);
        const ext = fileExt(job.name);
        setProgress(job, 60, '轉換中…');
        let converted;
        if (ext === 'html' || ext === 'htm' || ext === 'xml' || ext === 'xhtml') {
          converted = convertMarkupPreservingTags(raw, conv);
        } else {
          converted = conv(raw);
        }
        job.preview = converted;
        job.blob = new Blob([converted], { type: 'text/plain;charset=utf-8' });
        job.kind = 'text';
        job.downloadName = suggestedDownloadName(job.name, direction, ext || 'txt');
        setProgress(job, 100, '完成', 'done');
      }
      job.status = 'done';
      job.row.querySelector('.file-item-actions').hidden = false;
      openJob(id);
    } catch (e) {
      job.status = 'error';
      setProgress(job, 100, '錯誤: ' + (e.message || e), 'error');
    }
  }

  function openJob(id) {
    const job = fileJobs.get(id);
    if (!job || job.status !== 'done') return;
    activeJobId = id;
    inputText.value = job.preview || '(檔案已轉換 — 請用 Download 下載)';
    outputText.value = inputText.value;
    if (fileNameSpan) fileNameSpan.textContent = `${job.name} → ${job.downloadName}`;
    updateDownloadState();
  }

  function downloadJob(id) {
    const job = fileJobs.get(id);
    if (!job || !job.blob) return;
    const url = URL.createObjectURL(job.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.downloadName || 'converted.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  downloadBtn.addEventListener('click', () => {
    if (activeJobId && fileJobs.get(activeJobId)?.blob) {
      downloadJob(activeJobId);
      return;
    }
    if (!outputText.value) return;
    const direction = selected('direction') || 's2t';
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedDownloadName('converted.txt', direction, 'txt');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  return { updateDownloadState, getActiveJobId: () => activeJobId };
}
