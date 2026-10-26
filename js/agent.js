/**
 * Agent interface — 簡繁轉換 (simp_trad)
 * Static-hosted OpenCC via URL query parameters for agents / CLI.
 */

import OpenCC from '../lib/opencc-full.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const hasAnyParam = [...params.keys()].length > 0;
const helpRequested = params.has('help') || params.get('docs') === '1';

const directionRaw = (params.get('direction') || params.get('dir') || '').toLowerCase();
const localeRaw = (params.get('locale') || params.get('to') || params.get('from') || '').toLowerCase();
const input = params.get('input');

const LOCALES = new Set(['t', 'tw', 'twp', 'hk']);
const DIRECTIONS = new Set(['s2t', 't2s']);

if (!hasAnyParam || helpRequested) {
  showDocumentation();
} else if (input === null) {
  showError('Missing required parameter: input. Open agent.html with no params (or ?help=1) for docs.');
} else {
  setOutput('Loading...', 'loading');
  runConversion(directionRaw || 's2t', localeRaw || 't', input);
}

function runConversion(direction, locale, inputText) {
  if (!DIRECTIONS.has(direction)) {
    return showError(`Unknown direction "${direction}". Valid: s2t, t2s`);
  }
  if (!LOCALES.has(locale)) {
    return showError(`Unknown locale "${locale}". Valid: t, tw, twp, hk`);
  }
  if (inputText.length > 100000) {
    return showError('Input too long (max 100,000 characters)');
  }
  if (!inputText.trim()) {
    setOutput('', 'ready');
    return;
  }

  let converter;
  try {
    if (direction === 's2t') {
      converter = OpenCC.Converter({ from: 'cn', to: locale });
    } else {
      converter = OpenCC.Converter({ from: locale, to: 'cn' });
    }
  } catch (e) {
    return showError(`Failed to build converter: ${e.message}`);
  }

  try {
    setOutput(converter(inputText), 'ready');
  } catch (e) {
    return showError(`Conversion failed: ${e.message}`);
  }
}

function ensureOutputEl() {
  let el = document.getElementById('output');
  if (!el) {
    app.innerHTML = '';
    el = document.createElement('pre');
    el.id = 'output';
    app.appendChild(el);
  }
  return el;
}

function setOutput(text, status) {
  const el = ensureOutputEl();
  el.className = status === 'loading' ? 'loading' : (status === 'error' ? 'error' : '');
  el.dataset.status = status;
  el.textContent = text;
}

function showError(msg) {
  const line = msg.startsWith('Error:') ? msg : `Error: ${msg}`;
  setOutput(line, 'error');
}

function showDocumentation() {
  const doc = [
    '簡繁轉換 — Agent Interface',
    'Static-hosted client-side OpenCC. Humans use index.html; agents/CLI drive this page in a JS browser.',
    '',
    'USAGE: agent.html?input=<text>[&direction=s2t|t2s][&locale=t|tw|twp|hk]',
    'DOCS:  agent.html   or   agent.html?help=1',
    '',
    'PARAMETERS:',
    '  input       (required for translate) Text to convert (URL-encode non-ASCII)',
    '  direction   s2t (簡→繁, default) or t2s (繁→簡). Alias: dir',
    '  locale      t (OpenCC, default), tw, twp, hk. Alias: to / from',
    '              For s2t: target traditional variant.',
    '              For t2s: source traditional variant.',
    '',
    'EXAMPLES:',
    '  ?direction=s2t&locale=hk&input=%E8%BD%AF%E4%BB%B6',
    '  ?direction=t2s&locale=hk&input=%E8%BB%9F%E9%AB%94',
    '  ?input=%E6%B1%89%E8%AF%AD&locale=twp',
    '',
    'OUTPUT: Plain text in <pre id="output">.',
    '  Success: data-status="ready"',
    '  Error:   data-status="error", text starts with "Error:"',
    '  Docs:    no query params (or ?help=1)',
    '',
    'NOTE: Needs a JavaScript browser (agent-browser, Playwright, Puppeteer, or CLI that drives one).',
    '      Plain curl / HTTP fetch without JS will not run the converter.',
    'Engine: OpenCC via opencc-js (vendored). See SKILL.md.',
  ].join('\n');
  setOutput(doc, 'ready');
}
