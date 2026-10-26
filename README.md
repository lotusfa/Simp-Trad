# 簡繁轉換 (Simp-Trad)

Offline Simplified ↔ Traditional Chinese converter.

- **Live:** [toolbox.lotusfa.com/simp_trad](https://toolbox.lotusfa.com/simp_trad/)
- **Repo:** [github.com/lotusfa/Simp-Trad](https://github.com/lotusfa/Simp-Trad)

Pure client-side JS (vanilla ES modules). No backend. Conversion runs in the browser or via the local Node CLI.

## Features

- 簡 → 繁 / 繁 → 簡
- Traditional variants: OpenCC standard, Taiwan, Taiwan (phrases), Hong Kong
- File convert UI (txt / md / csv / srt / epub and other text-based types)
- Dark mode + copy output
- Works offline after page + `lib/opencc-full.js` load (no CDN for conversion)

## Engine

- [OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0)
- [opencc-js](https://github.com/nk2028/opencc-js) (MIT) — vendored at `lib/opencc-full.js`

## Clone

```bash
git clone https://github.com/lotusfa/Simp-Trad.git
cd Simp-Trad
```

## Local CLI (Node ≥ 18)

No browser needed:

```bash
./cli.sh --s2t --locale hk "软件"
./cli.sh --t2s -i in.txt -o out.txt
echo "软件" | ./cli.sh --s2t -l tw
# optional: npm link  →  simp-trad --s2t 软件
```

See [`SKILL.md`](./SKILL.md) for flags and agent usage.

## Local web preview

If this folder sits under toolbox `public/simp_trad` (with `../ipa/css` available):

```bash
cd ..   # public/
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/simp_trad/

Standalone clone: serve this directory and ensure theme CSS is reachable, or open via the live toolbox site.

## Agent (browser)

Static agent endpoint: [`agent.html`](./agent.html) — URL query params, read `#output[data-status]`. Prefer `./cli.sh` when the agent can run shell. Details in [`SKILL.md`](./SKILL.md).

Example:

```text
https://toolbox.lotusfa.com/simp_trad/agent.html?direction=s2t&locale=hk&input=%E8%BD%AF%E4%BB%B6
```
