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

  /* ── 1b. language (en / zh) ──
     Pages provide a global MT_I18N = { key: { en:'…', zh:'…' }, … }.
     Static text: <el data-i18n="key">, placeholders: data-i18n-ph,
     title attributes: data-i18n-title.
     Dynamic strings: call window.mtT('key'); re-render on the
     'mt-lang-change' event. */
  var LANG_KEY = 'mt-lang';
  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; }
  }
  window.mtLang = getLang;
  window.mtT = function (key) {
    var dict = window.MT_I18N || {};
    var entry = dict[key];
    if (!entry) return key;
    return entry[getLang()] || entry.en || key;
  };
  function applyLang() {
    var lang = getLang();
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = window.mtT(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = window.mtT(el.getAttribute('data-i18n-ph'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = window.mtT(el.getAttribute('data-i18n-title'));
    });
    var btn = document.getElementById('mt-lang-btn');
    if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中';
    /* header page title/sub from body data attributes */
    var body = document.body;
    var t = document.querySelector('.mt-page-title');
    var s = document.querySelector('.mt-page-sub');
    if (t) t.textContent = (lang === 'zh' && body.getAttribute('data-title-zh')) ||
                           body.getAttribute('data-title') || '';
    if (s) s.textContent = (lang === 'zh' && body.getAttribute('data-sub-zh')) ||
                           body.getAttribute('data-sub') || '';
    /* nav dropdown tool names/descs */
    if (typeof MT_TOOLS !== 'undefined') {
      document.querySelectorAll('.mt-nav-menu a').forEach(function (a, i) {
        var tool = MT_TOOLS[i];
        if (!tool) return;
        var name = (lang === 'zh' && tool.name_zh) || tool.name;
        var desc = (lang === 'zh' && tool.desc_zh) || tool.desc;
        a.innerHTML = tool.icon + ' ' + name +
          '<span class="mt-nav-desc">' + desc + '</span>';
      });
    }
  }
  window.mtApplyLang = applyLang;
  window.mtToggleLang = function () {
    var next = getLang() === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
    applyLang();
    document.dispatchEvent(new CustomEvent('mt-lang-change', { detail: { lang: next } }));
    gaTrack('toggle_lang', next);
  };

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

    /* language toggle */
    var lbtn = document.createElement('button');
    lbtn.className = 'mt-icon-btn';
    lbtn.id = 'mt-lang-btn';
    lbtn.title = 'Switch language / 切換語言';
    lbtn.textContent = getLang() === 'zh' ? 'EN' : '中';
    lbtn.addEventListener('click', window.mtToggleLang);
    right.appendChild(lbtn);

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
    applyLang();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildHeader);
  } else {
    buildHeader();
  }
})();
