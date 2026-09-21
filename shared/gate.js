/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — password gate (client-side, deterrent only)

   Usage: first <script> in <head> of any page that needs a password:
     <script src="../../shared/gate.js"></script>

   ⚠ Security note: this is a static site. The gate stops casual users,
   but anyone who reads the source or fetches the tool's JS files
   directly can bypass it. Do not put real secrets behind it.

   Only a salted PBKDF2 hash is stored here, never the password.
   Change the password:  node scripts/set-gate-password.js <new-password>
   (rewrites `salt` / `hash` below; changing it also invalidates every
   already-unlocked session).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = {
    iter: 100000,
    salt: 'c54d6ce2f5646a51652c7cfd5f1cf4c1',
    hash: '429e7b09a5730ba4b5d875d765948bf848fac470f1a967c43835b805f22acdb0'
  };
  var SESSION_KEY = 'mt-gate-ok';

  function ssGet() { try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; } }
  function ssSet(v) { try { sessionStorage.setItem(SESSION_KEY, v); } catch (e) {} }

  /* already unlocked in this tab session */
  if (ssGet() === CFG.hash) return;

  /* hide everything until unlocked (no flash of the tool) */
  var lock = document.createElement('style');
  lock.id = 'mt-gate-style';
  lock.textContent =
    'html.mt-locked body > *:not(#mt-gate){display:none!important}' +
    'html.mt-locked body{overflow:hidden}' +
    '#mt-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
    'justify-content:center;background:#f3f4f6;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#mt-gate form{background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:28px 26px;' +
    'width:min(340px,90vw);box-shadow:0 8px 30px rgba(0,0,0,.12);color:#111827}' +
    '#mt-gate h1{font-size:16px;margin:0 0 6px}' +
    '#mt-gate p{font-size:12px;color:#6b7280;margin:0 0 16px;line-height:1.5}' +
    '#mt-gate input{width:100%;box-sizing:border-box;padding:9px 10px;font-size:14px;' +
    'border:1px solid #d1d5db;border-radius:6px;margin-bottom:10px;background:#fff;color:#111827}' +
    '#mt-gate button{width:100%;padding:9px;font-size:14px;border:0;border-radius:6px;' +
    'background:#2563eb;color:#fff;cursor:pointer}' +
    '#mt-gate button:disabled{opacity:.6;cursor:default}' +
    '#mt-gate .err{color:#dc2626;font-size:12px;min-height:16px;margin-top:8px}' +
    'html[data-theme=dark] #mt-gate{background:#111827}' +
    'html[data-theme=dark] #mt-gate form{background:#1f2937;border-color:#374151;color:#f3f4f6}' +
    'html[data-theme=dark] #mt-gate input{background:#111827;border-color:#374151;color:#f3f4f6}';
  document.head.appendChild(lock);
  document.documentElement.classList.add('mt-locked');

  var T = {
    en: { title: 'Access restricted', hint: 'Enter the password to use this tool.',
          ph: 'Password', btn: 'Unlock', wrong: 'Incorrect password.',
          wait: 'Too many attempts. Wait {s}s.', nocrypto: 'This browser cannot verify passwords (Web Crypto unavailable; use https or a modern browser).' },
    zh: { title: '需要授權', hint: '請輸入密碼以使用此工具。',
          ph: '密碼', btn: '解鎖', wrong: '密碼錯誤。',
          wait: '嘗試次數過多，請等待 {s} 秒。', nocrypto: '此瀏覽器無法驗證密碼（缺少 Web Crypto；請用 https 或較新的瀏覽器）。' }
  };
  function lang() {
    try { return localStorage.getItem('mt-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; }
  }

  function hexToBytes(h) {
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToHex(buf) {
    var a = new Uint8Array(buf), s = '';
    for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
    return s;
  }
  function derive(pw) {
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle) return Promise.reject(new Error('nocrypto'));
    return subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(CFG.salt), iterations: CFG.iter }, key, 256);
      })
      .then(bytesToHex);
  }

  function build() {
    var L = T[lang()];
    var wrap = document.createElement('div');
    wrap.id = 'mt-gate';
    wrap.innerHTML =
      '<form autocomplete="off"><h1></h1><p></p>' +
      '<input type="password" autocomplete="current-password" required>' +
      '<button type="submit"></button><div class="err" role="alert"></div></form>';
    var form = wrap.firstChild;
    form.querySelector('h1').textContent = '🔒 ' + L.title;
    form.querySelector('p').textContent = L.hint;
    var input = form.querySelector('input');
    input.placeholder = L.ph;
    var btn = form.querySelector('button');
    btn.textContent = L.btn;
    var err = form.querySelector('.err');

    var fails = 0, blockedUntil = 0;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var now = Date.now();
      if (now < blockedUntil) {
        err.textContent = L.wait.replace('{s}', Math.ceil((blockedUntil - now) / 1000));
        return;
      }
      btn.disabled = true;
      err.textContent = '';
      derive(input.value).then(function (h) {
        if (h === CFG.hash) {
          ssSet(CFG.hash);
          wrap.remove();
          lock.remove();
          document.documentElement.classList.remove('mt-locked');
          /* charts sized while hidden need a nudge */
          window.dispatchEvent(new Event('resize'));
        } else {
          fails++;
          if (fails >= 3) blockedUntil = Date.now() + Math.min(60, Math.pow(2, fails - 2) * 2) * 1000;
          err.textContent = L.wrong;
          input.select();
        }
      }).catch(function (e) {
        err.textContent = (e && e.message === 'nocrypto') ? L.nocrypto : L.wrong;
      }).then(function () { btn.disabled = false; });
    });

    document.body.appendChild(wrap);
    input.focus();
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
