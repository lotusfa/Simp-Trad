# 簡繁轉換 (simp_trad)

Offline Simplified ↔ Traditional Chinese converter for [toolbox.lotusfa.com](https://toolbox.lotusfa.com/).

Pure client-side JS. UI matches the IPA / toolbox theme (`../ipa/css/styles.css`).

## Features

- 簡 → 繁 / 繁 → 簡
- Traditional variants: OpenCC standard, Taiwan, Taiwan (phrases), Hong Kong
- Dark mode + copy output
- Works offline after page + `lib/opencc-full.js` load (no CDN for conversion)

## Engine

- [OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0)
- [opencc-js](https://github.com/nk2028/opencc-js) (MIT) — vendored at `lib/opencc-full.js`

## Local preview

From the toolbox `public/` folder:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/simp_trad/

## Agent / CLI

Static agent endpoint: [`agent.html`](./agent.html) — same OpenCC bundle, URL query params. See [`SKILL.md`](./SKILL.md).
