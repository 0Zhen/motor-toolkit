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
| DCR Calculator | `tools/dcr-calculator/` | Convert turns / wire diameter / DCR / slot fill factor, quick calibration or full geometry mode, wire-diameter sweep table |
| Winding Designer | `tools/winding-designer/` | Star-of-slots winding layout for any pole/slot/layer combination (integer- and fractional-slot), fundamental winding factor |
| Cost Calculator | `tools/cost-calculator/` | Estimate silicon steel / copper / magnet or rotor material cost from geometry, slot/pole count and winding data. PMSM, EESM and induction motor support |
| Slot Packing Viewer | `tools/slot-packing/` | Visualize turns packing into a stator slot — parametric trapezoid or custom vertices, editable point table, simple row-by-row circle packing |

## Architecture

```
index.html            homepage — hero + tool cards grouped from the registry
shared/
  theme.css           single source of truth: design tokens (colors, fonts,
                      type scale, radii) for light/dark, header, homepage,
                      and the shared tool components (sidebar layout,
                      sections, inputs, tabs, result cards, tables)
  shell.js            injects the unified header, manages the theme
                      (data-theme on <html>, localStorage "mt-theme"),
                      language, Google Analytics, window.gaTrack, mtIcon()
  tools.js            the tool registry (MT_TOOLS) and groups (MT_GROUPS)
vendor/               third-party libs vendored locally (no CDN dependency)
  fonts/              IBM Plex Sans / Mono woff2 (SIL OFL)
tools/<id>/           one folder per tool: index.html + styles.css + *.js
```

Rules that keep it maintainable:

- **No build tools, no ES modules.** Plain `<script src>` in order, so every
  page also works under `file://`.
- **Theme**: only `shared/shell.js` touches `data-theme` / localStorage.
  Tools that need to restyle charts on theme switch listen for the
  `mt-theme-change` CustomEvent on `document`, and read colors from the CSS
  variables (`getComputedStyle(document.documentElement)`).
- **Styling**: tool pages load `shared/theme.css` first, then their own
  `styles.css` for tool-specific rules only. Use the shared variables
  (`--bg`, `--surface`, `--text`, `--text2`, `--accent`, `--fs-xs` … `--fs-2xl`,
  `--r-md`, …) — don't hardcode UI colors or font sizes. Nothing below
  `--fs-xs` (12px). Fixed engineering palettes (slot materials, phase
  colors) are the only hardcoded colors.
- **Sidebar tools**: `<body class="mt-app">` + `.layout` > `.input-panel`
  (or `.panel`) + `.results-col` gives the fixed-height desktop app layout
  that stacks into a scrolling page below 900px. Set the sidebar width with
  `--panel-w` and the input column with `--input-w` in the tool's styles.css.
  Reuse `.params-box`, `.section-title`, `.param-row-2`, `.param-label`,
  `.param-input`, `.mini-select`, `.hint-text`, `.mode-tabs`, `.result-card`,
  `.sweep-table` from theme.css instead of redefining them.

## Adding a new tool

1. Copy an existing tool folder (e.g. `tools/efficiency-map/`) to `tools/<new-id>/`.
2. Keep the head/script order:
   `shared/theme.css` → `styles.css` → `shared/tools.js` → `shared/shell.js` → vendor libs → your js.
   Set the page title via `<body data-title="…" data-sub="…">`.
3. Add ONE entry to `shared/tools.js` (`MT_TOOLS`) with a `group` (one of
   `MT_GROUPS`) and an `icon` (inner markup of a 24×24 stroke-only SVG) — the
   homepage card and the header dropdown update automatically.
4. Add the page URL to `sitemap.xml`.

## Local preview

```
python -m http.server 8000
# → http://localhost:8000/
```

or just open `index.html` in a browser.
