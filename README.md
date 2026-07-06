# NOGRUP Card Maker

A browser-based tool for building a custom "What Do You Meme?"-style card
deck from photos/stickers and text prompts, then exporting print-ready PDFs.

## Structure

```
index.html      Page markup (tabs, forms, print areas)
css/styles.css  All styling, including the print stylesheet (@media print)
js/app.js       All app logic: deck state, rendering, PDF export
```

No build step, no framework, no bundler. It's plain HTML/CSS/JS. Open
`index.html` directly in a browser, or serve the folder with any static
file server.

## How it works

- **State**: a single in-memory `deck` array holds every card (type
  `photo` or `caption`). Nothing is persisted — refreshing the page clears
  the deck by design (everything stays local to the browser tab, no
  server, no accounts).
- **Rendering**: each tab re-renders from `deck` on demand
  (`renderPhotoDeck`, `renderPromptDeck`, `renderStickerPrintSheet`,
  `renderPromptPrintSheet`). There's no virtual DOM — it's plain
  `innerHTML`/`createElement` rebuilding on every change.
- **Card layout math**: `renderPrintSheetGeneric` computes how many cards
  fit per sheet at true card aspect ratio (5:7), choosing whichever
  orientation (upright or rotated 90°) wastes the least paper, then
  builds each `.card-face` with the border text and rotation math baked
  in via inline styles (since exact pixel geometry is needed for the
  rotated border/caption text to line up).
- **PDF export**: `html2canvas` rasterizes each `.sheet` (one printable
  page) to a canvas, `jsPDF` wraps that image into a single-page PDF at
  the correct physical size, and `JSZip` bundles one PDF per sheet into
  a single `.zip` download.

## Dependencies

Loaded via CDN in `index.html` — no `npm install` needed:
- [html2canvas](https://html2canvas.hertzen.com/) 1.4.1
- [jsPDF](https://github.com/parallax/jsPDF) 2.5.1
- [JSZip](https://stuk.github.io/jszip/) 3.10.1

## Known constraints worth knowing before extending this

- `html2canvas` doesn't reliably support CSS `writing-mode`, so all
  "vertical" text (card borders, rotated captions) is done with plain
  horizontal text + `transform: rotate()`, not `writing-mode`. Keep that
  pattern if you add more rotated text — writing-mode will silently
  break the PDF export even though it looks fine on screen.
- Font-fitting (`fitBorderText`, `fitCaptionText`) is done by brute-force
  shrinking/growing the CSS `font-size` in a loop and re-measuring
  `scrollWidth`/`scrollHeight` — there's no canvas-based text measurement.
  It's cheap enough at this scale (a few dozen cards) but would need
  rethinking for hundreds of cards per render.
- All image transforms (sticker rotation) are baked into the image data
  itself via an offscreen `<canvas>`, not CSS — so the exported image is
  always correctly oriented regardless of how it's later rendered.

## Deploying

Any static host works: GitHub Pages, Netlify, Vercel, Cloudflare Pages,
or just a plain `python3 -m http.server` for local use. There's no
backend and no environment variables.

## Turning this into a "real" app

If you want to go further (accounts, saved decks, mobile app, etc.), the
natural next steps would be:
- Move `deck` state into a proper store (or a framework) once
  `js/app.js` gets unwieldy.
- Swap the in-memory-only deck for `localStorage`/IndexedDB or a backend
  if you want decks to persist across sessions.
- If wrapping as a native app (e.g. with Capacitor/Tauri), the DOM-to-PDF
  pipeline (`html2canvas` + `jsPDF`) should still work unchanged since it
  doesn't depend on being in a browser tab specifically — just a webview.
