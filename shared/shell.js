/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — shared shell
   Responsibilities:
     1. Apply saved theme ASAP (avoid flash of wrong theme)
     2. Inject the unified site header (site name / page title /
        tools dropdown / theme toggle)
     3. Google Analytics (fails silently offline / under file://)

   Usage on every page (order matters):
     <link rel="stylesheet" href="<base>shared/theme.css">
     <script src="<base>shared/tools.js"></script>
     <script src="<base>shared/shell.js"></script>
   Page title/subtitle come from <body data-title="…" data-sub="…">.
   Site root is derived from this script's own src — no per-page
   configuration needed, works on GitHub Pages and file:// alike.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* site root, derived from …/shared/shell.js */
  var src  = document.currentScript.src;
  var BASE = src.slice(0, src.lastIndexOf('shared/'));

  /* ── 1. theme ── */
  var THEME_KEY = 'mt-theme';
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var icon = document.getElementById('mt-theme-icon');
    if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
    /* let tools re-style their charts */
    document.dispatchEvent(new CustomEvent('mt-theme-change', { detail: { theme: t } }));
  }
  document.documentElement.setAttribute('data-theme', getTheme());

  window.mtToggleTheme = function () {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    gaTrack('toggle_theme', getTheme());
  };
  window.mtTheme = getTheme;

  /* ── 3. Google Analytics ── */
  var GA_ID = 'G-XT1MLNL88T';
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
  if (location.protocol !== 'file:') {
    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);
  }
  function gaTrack(action, label) {
    try {
      window.gtag('event', action, { event_category: 'MotorToolkit', event_label: label });
    } catch (e) {}
  }
  window.gaTrack = gaTrack;

  /* ── 2. header injection ── */
  function buildHeader() {
    var body  = document.body;
    var title = body.getAttribute('data-title') || '';
    var sub   = body.getAttribute('data-sub') || '';

    var header = document.createElement('header');
    header.className = 'mt-header';

    var left = document.createElement('div');
    left.className = 'mt-header-left';
    var home = document.createElement('a');
    home.className = 'mt-site-name';
    home.href = BASE + 'index.html';
    home.textContent = 'MOTOR TOOLKIT';
    left.appendChild(home);
    if (title) {
      var t = document.createElement('div');
      var h = document.createElement('div');
      h.className = 'mt-page-title';
      h.textContent = title;
      t.appendChild(h);
      if (sub) {
        var s = document.createElement('div');
        s.className = 'mt-page-sub';
        s.textContent = sub;
        t.appendChild(s);
      }
      left.appendChild(t);
    }

    var right = document.createElement('div');
    right.className = 'mt-header-right';

    /* tools dropdown */
    if (typeof MT_TOOLS !== 'undefined') {
      var nav = document.createElement('nav');
      nav.className = 'mt-nav';
      var btn = document.createElement('button');
      btn.className = 'mt-nav-btn';
      btn.textContent = 'Tools ▾';
      var menu = document.createElement('div');
      menu.className = 'mt-nav-menu';
      MT_TOOLS.forEach(function (tool) {
        var a = document.createElement('a');
        a.href = BASE + tool.path + 'index.html';
        a.innerHTML = tool.icon + ' ' + tool.name +
          '<span class="mt-nav-desc">' + tool.desc + '</span>';
        menu.appendChild(a);
      });
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', function () { menu.classList.remove('open'); });
      nav.appendChild(btn);
      nav.appendChild(menu);
      right.appendChild(nav);
    }

    /* theme toggle */
    var tbtn = document.createElement('button');
    tbtn.className = 'mt-icon-btn';
    tbtn.title = 'Toggle dark / light theme';
    tbtn.innerHTML = '<span id="mt-theme-icon">' + (getTheme() === 'dark' ? '☀️' : '🌙') + '</span>';
    tbtn.addEventListener('click', window.mtToggleTheme);
    right.appendChild(tbtn);

    header.appendChild(left);
    header.appendChild(right);
    body.insertBefore(header, body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader);
  } else {
    buildHeader();
  }
})();
