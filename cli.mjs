#!/usr/bin/env node
/**
 * Offline CLI for 簡繁轉換 (vendored opencc-js).
 *
 * Usage:
 *   node cli.mjs --s2t --locale hk "软件"
 *   echo "软件" | node cli.mjs --s2t
 *   node cli.mjs --t2s -i in.txt -o out.txt
 *   node cli.mjs --help
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import OpenCC from './lib/opencc-full.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = new Set(['t', 'tw', 'twp', 'hk']);
const DIRECTIONS = new Set(['s2t', 't2s']);

function usage(code = 0) {
  const msg = `simp_trad CLI — offline Simplified ↔ Traditional Chinese (OpenCC)

Usage:
  node cli.mjs [options] [text...]
  echo TEXT | node cli.mjs [options]
  node cli.mjs [options] -i FILE [-o FILE]

Options:
  --s2t              簡 → 繁 (default)
  --t2s              繁 → 簡
  --direction, -d    s2t | t2s
  --locale, -l       t | tw | twp | hk (default: t)
  --input, -i FILE   read text from file (UTF-8)
  --output, -o FILE  write result to file (UTF-8)
  --help, -h         show this help

Examples:
  node cli.mjs --s2t --locale hk 软件
  node cli.mjs --t2s -i trad.txt -o simp.txt
  printf '%s' '软件' | node cli.mjs -d s2t -l twp
`;
  process.stdout.write(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const opts = {
    direction: 's2t',
    locale: 't',
    inputFile: null,
    outputFile: null,
    positional: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--s2t') opts.direction = 's2t';
    else if (a === '--t2s') opts.direction = 't2s';
    else if (a === '--direction' || a === '-d') {
      opts.direction = String(argv[++i] || '').toLowerCase();
    } else if (a === '--locale' || a === '-l') {
      opts.locale = String(argv[++i] || '').toLowerCase();
    } else if (a === '--input' || a === '-i') {
      opts.inputFile = argv[++i];
    } else if (a === '--output' || a === '-o') {
      opts.outputFile = argv[++i];
    } else if (a.startsWith('-')) {
      process.stderr.write(`Unknown option: ${a}\n`);
      usage(1);
    } else {
      opts.positional.push(a);
    }
  }
  return opts;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function buildConverter(direction, locale) {
  if (!DIRECTIONS.has(direction)) {
    throw new Error(`Unknown direction "${direction}". Valid: s2t, t2s`);
  }
  if (!LOCALES.has(locale)) {
    throw new Error(`Unknown locale "${locale}". Valid: t, tw, twp, hk`);
  }
  if (direction === 's2t') {
    return OpenCC.Converter({ from: 'cn', to: locale });
  }
  return OpenCC.Converter({ from: locale, to: 'cn' });
}

const opts = parseArgs(process.argv.slice(2));

let input = '';
if (opts.inputFile) {
  if (!existsSync(opts.inputFile)) {
    process.stderr.write(`Error: input file not found: ${opts.inputFile}\n`);
    process.exit(1);
  }
  input = readFileSync(opts.inputFile, 'utf8');
} else if (opts.positional.length) {
  input = opts.positional.join(' ');
} else {
  input = await readStdin();
}

if (!input) {
  process.stderr.write('Error: no input. Pass text, -i FILE, or pipe stdin.\n');
  usage(1);
}

let converter;
try {
  converter = buildConverter(opts.direction, opts.locale);
} catch (e) {
  process.stderr.write(`Error: ${e.message}\n`);
  process.exit(1);
}

let out;
try {
  out = converter(input);
} catch (e) {
  process.stderr.write(`Error: conversion failed: ${e.message}\n`);
  process.exit(1);
}

if (opts.outputFile) {
  writeFileSync(opts.outputFile, out, 'utf8');
} else {
  process.stdout.write(out);
  if (!out.endsWith('\n') && (opts.positional.length || process.stdin.isTTY)) {
    process.stdout.write('\n');
  }
}
