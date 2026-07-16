# Motor Toolkit

Browser-based engineering tools for motor design and testing.
Static site — no build step, no server, no data leaves the browser.
Works both on GitHub Pages and opened directly from disk (`file://`).

**Live:** https://0zhen.github.io/motor-toolkit/

## Tools

| Tool | Path | What it does |
|------|------|--------------|
| Efficiency Map | `tools/efficiency-map/` | Contour efficiency map from speed / torque / efficiency points, PNG export |
| FFT Analyser | `tools/fft-analyser/` | Spectrum analysis, harmonic extraction, THD, window functions |
| Working Point Explorer | `tools/working-point/` | Solve motor stable working point, sweep design parameters |

## Architecture

```
index.html            homepage — tool cards generated from the registry
shared/
  theme.css           single source of truth: CSS variables (light/dark),
                      header, cards, buttons, inputs
  shell.js            injects the unified header, manages the theme
                      (data-theme on <html>, localStorage "mt-theme"),
                      Google Analytics, window.gaTrack
  tools.js            the tool registry (MT_TOOLS)
vendor/               third-party libs vendored locally (no CDN dependency)
tools/<id>/           one folder per tool: index.html + styles.css + *.js
```

Rules that keep it maintainable:

- **No build tools, no ES modules.** Plain `<script src>` in order, so every
  page also works under `file://`.
- **Theme**: only `shared/shell.js` touches `data-theme` / localStorage.
  Tools that need to restyle charts on theme switch listen for the
  `mt-theme-change` CustomEvent on `document`.
- **Styling**: tool pages load `shared/theme.css` first, then their own
  `styles.css` for tool-specific rules. Use the shared CSS variables
  (`--bg`, `--surface`, `--text`, `--accent`, …) — don't hardcode colors.

## Adding a new tool

1. Copy an existing tool folder (e.g. `tools/efficiency-map/`) to `tools/<new-id>/`.
2. Keep the head/script order:
   `shared/theme.css` → `styles.css` → `shared/tools.js` → `shared/shell.js` → vendor libs → your js.
   Set the page title via `<body data-title="…" data-sub="…">`.
3. Add ONE entry to `shared/tools.js` (`MT_TOOLS`) — the homepage card and the
   header dropdown update automatically.
4. Add the page URL to `sitemap.xml`.

## Local preview

```
python -m http.server 8000
# → http://localhost:8000/
```

or just open `index.html` in a browser.
