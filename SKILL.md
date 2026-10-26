---
name: simp-trad
description: Convert between Simplified and Traditional Chinese offline with OpenCC (Taiwan/Hong Kong variants). Use when the user asks for 簡繁轉換, 简繁转换, Traditional/Simplified Chinese conversion, or OpenCC.
---

# 簡繁轉換 — Agent Interface

Static-hosted OpenCC converter. Humans use `index.html`; **agents and CLI tools** drive `agent.html` in a JavaScript browser and read `#output`.

## Hosting model

- Static files only. Conversion runs in the browser (vendored `opencc-js`).
- No server API. Plain HTTP without JS will not convert.

## How agents / CLI should call it

1. Open the URL with query params (URL-encode non-ASCII `input`).
2. Wait until `#output` has `data-status="ready"` or `data-status="error"`.
3. Read `pre#output` text.
4. If text starts with `Error:`, treat as failure.

**Do not** use curl / WebFetch alone for translate mode.

Docs: open with no query string, or `?help=1`.


## Local CLI (clone / submodule)

No browser needed. Requires Node.js ≥ 18.

```bash
git clone https://git.souls-like.com/fj-lotusfa/simp_trad.git
cd simp_trad
node cli.mjs --s2t --locale hk "软件"
./cli.sh --s2t --locale hk "软件"  # same, via bash wrapper
echo "软件" | node cli.mjs --s2t -l tw
node cli.mjs --t2s -i in.txt -o out.txt
# optional: npm link  →  simp-trad --s2t 软件
```

Flags: `--s2t` / `--t2s` (or `-d`), `--locale` / `-l` (`t`|`tw`|`twp`|`hk`), `-i` / `-o`.

Agents that can run shell on a checkout should prefer this CLI over `agent.html`.

## Base URL

[https://toolbox.lotusfa.com/simp_trad/agent.html](https://toolbox.lotusfa.com/simp_trad/agent.html)

## Query parameters

| Param | Required | Description |
|-------|----------|-------------|
| `input` | Yes (translate) | Text to convert |
| `direction` / `dir` | No | `s2t` (default) or `t2s` |
| `locale` / `to` / `from` | No | `t` (default), `tw`, `twp`, `hk` |
| `help` / `docs=1` | Docs | Show documentation |

## Example

```bash
agent-browser open "https://toolbox.lotusfa.com/simp_trad/agent.html?direction=s2t&locale=hk&input=%E8%BD%AF%E4%BB%B6"
agent-browser wait --load networkidle
agent-browser get text "pre#output"
```

## Output contract

| `data-status` | Meaning |
|---------------|---------|
| `loading` | Still working |
| `ready` | Success or documentation |
| `error` | Failure; text starts with `Error:` |
