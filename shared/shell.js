/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — shared shell
   Responsibilities:
     1. Apply saved theme ASAP (avoid flash of wrong theme)
     2. Inject the unified site header (logo / page title /
        grouped tools dropdown / language + theme toggles)
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
    var tbtn = document.getElementById('mt-theme-btn');
    if (tbtn) tbtn.innerHTML = themeIcon(t);
    /* let tools re-style their charts */
    document.dispatchEvent(new CustomEvent('mt-theme-change', { detail: { theme: t } }));
  }
  document.documentElement.setAttribute('data-theme', getTheme());

  /* ── icons ── */
  function svg(inner, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + inner + '</svg>';
  }
  /* a tool's registry icon as an inline SVG string */
  window.mtIcon = function (tool, size) { return svg(tool.icon || '', size || 22); };
  var LOGO = '<svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" ' +
    'stroke-width="2" aria-hidden="true"><circle cx="14" cy="14" r="11"/><circle cx="14" cy="14" r="5"/>' +
    '<path d="M14 3v4M14 21v4M3 14h4M21 14h4M6.2 6.2l2.8 2.8M19 19l2.8 2.8M6.2 21.8L9 19M19 9l2.8-2.8"/></svg>';
  var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  var SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4' +
             'M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  function themeIcon(t) { return svg(t === 'dark' ? SUN : MOON, 18); }

  /* tools grouped by MT_GROUPS, in registry order */
  window.mtToolGroups = function () {
    if (typeof MT_TOOLS === 'undefined') return [];
    var groups = (typeof MT_GROUPS !== 'undefined') ? MT_GROUPS : [{ id: '', name: '' }];
    return groups.map(function (g) {
      return { group: g, tools: MT_TOOLS.filter(function (t) { return !g.id || t.group === g.id; }) };
    }).filter(function (x) { return x.tools.length; });
  };

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
    renderNav();
    var nl = document.querySelector('.mt-nav-btn-label');
    if (nl) nl.textContent = lang === 'zh' ? '所有工具' : 'All tools';
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
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* tools dropdown contents — rebuilt on language change */
  function renderNav() {
    var menu = document.querySelector('.mt-nav-menu');
    if (!menu) return;
    var zh = getLang() === 'zh';
    var here = location.pathname.replace(/index\.html$/, '');
    menu.innerHTML = '';
    mtToolGroups().forEach(function (gr) {
      if (gr.group.name) {
        menu.appendChild(el('div', 'mt-nav-group', '')).textContent =
          (zh && gr.group.name_zh) || gr.group.name;
      }
      gr.tools.forEach(function (tool) {
        var a = el('a', '', mtIcon(tool, 18));
        a.href = BASE + tool.path + 'index.html';
        if (here.slice(-tool.path.length) === tool.path) a.setAttribute('aria-current', 'page');
        var txt = el('span');
        txt.appendChild(document.createTextNode((zh && tool.name_zh) || tool.name));
        txt.appendChild(el('span', 'mt-nav-desc')).appendChild(
          document.createTextNode((zh && tool.desc_zh) || tool.desc));
        a.appendChild(txt);
        menu.appendChild(a);
      });
    });
  }

  function buildHeader() {
    var body  = document.body;
    var title = body.getAttribute('data-title') || '';
    var sub   = body.getAttribute('data-sub') || '';

    var header = el('header', 'mt-header' + (title ? '' : ' mt-header--home'));

    var left = el('div', 'mt-header-left');
    var home = el('a', 'mt-site-name', LOGO + '<span class="mt-site-label">Motor Toolkit</span>');
    home.href = BASE + 'index.html';
    home.setAttribute('aria-label', 'Motor Toolkit home');
    left.appendChild(home);
    if (title) {
      left.appendChild(el('span', 'mt-crumb-sep', '/')).setAttribute('aria-hidden', 'true');
      var head = el('div', 'mt-page-head');
      head.appendChild(el('div', 'mt-page-title')).textContent = title;
      if (sub) head.appendChild(el('div', 'mt-page-sub')).textContent = sub;
      left.appendChild(head);
    }

    var right = el('div', 'mt-header-right');

    /* tools dropdown */
    if (typeof MT_TOOLS !== 'undefined') {
      var nav = el('nav', 'mt-nav');
      var btn = el('button', 'mt-nav-btn',
        svg('<path d="M4 6h16M4 12h16M4 18h16"/>', 16) + '<span class="mt-nav-btn-label">All tools</span>');
      btn.type = 'button';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      var menu = el('div', 'mt-nav-menu');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        btn.setAttribute('aria-expanded', menu.classList.toggle('open') ? 'true' : 'false');
      });
      document.addEventListener('click', function () {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });
      nav.appendChild(btn);
      nav.appendChild(menu);
      right.appendChild(nav);
    }

    /* language toggle */
    var lbtn = el('button', 'mt-icon-btn');
    lbtn.type = 'button';
    lbtn.id = 'mt-lang-btn';
    lbtn.title = 'Switch language / 切換語言';
    lbtn.setAttribute('aria-label', 'Switch language / 切換語言');
    lbtn.addEventListener('click', window.mtToggleLang);
    right.appendChild(lbtn);

    /* theme toggle */
    var tbtn = el('button', 'mt-icon-btn', themeIcon(getTheme()));
    tbtn.type = 'button';
    tbtn.id = 'mt-theme-btn';
    tbtn.title = 'Toggle dark / light theme';
    tbtn.setAttribute('aria-label', 'Toggle dark / light theme');
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
