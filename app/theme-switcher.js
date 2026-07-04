/* ─────────────────────────────────────────────────────────────
   FEISTTECH — Site-wide theme switcher.
   Applies data-theme to <html> from a single shared localStorage
   key so a choice made on any page holds on every other page.
   Include as an early, non-deferred <script> (right after
   theme-vars.css / themes.css) so the attribute is set before
   first paint.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var STORAGE_KEY = 'feisttech-theme';

  var THEMES = [
    { id: 'patina',   label: 'Patina',   swatch: '#c9a84c' },
    { id: 'cyan',     label: 'Cyan',     swatch: '#00e5ff' },
    { id: 'imperial', label: 'Imperial', swatch: '#e8c46a' },
    { id: 'night',    label: 'Night',    swatch: '#e8d39a' }
  ];

  function get() {
    try { return localStorage.getItem(STORAGE_KEY) || 'patina'; }
    catch (e) { return 'patina'; }
  }

  function set(id) {
    if (!THEMES.some(function (t) { return t.id === id; })) return;
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
    document.dispatchEvent(new CustomEvent('feisttech-theme-change', { detail: { theme: id } }));
    document.querySelectorAll('[data-feisttheme-swatch]').forEach(function (el) {
      el.classList.toggle('on', el.dataset.feisttheme === id);
    });
  }

  // Apply immediately — this runs synchronously wherever the script tag sits.
  document.documentElement.setAttribute('data-theme', get());

  // Keep tabs in sync: if the theme changes in another tab, follow it here too.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && e.newValue) {
      document.documentElement.setAttribute('data-theme', e.newValue);
    }
  });

  var STYLE_ID = 'feisttheme-widget-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.feisttheme-widget{position:relative;display:inline-block;font-family:var(--font-mono,monospace);}' +
      '.feisttheme-btn{background:transparent;border:1px solid var(--panel-edge,rgba(255,255,255,.2));' +
      'color:var(--ink,#ddd);border-radius:4px;padding:5px 10px;font:inherit;font-size:.72rem;' +
      'letter-spacing:.06em;cursor:pointer;}' +
      '.feisttheme-btn:hover{border-color:var(--accent,#c9a84c);color:var(--accent,#c9a84c);}' +
      '.feisttheme-popover{position:absolute;top:calc(100% + 6px);right:0;z-index:80;min-width:140px;' +
      'background:var(--bg-soft,#141414);border:1px solid var(--panel-edge,rgba(255,255,255,.2));' +
      'border-radius:6px;padding:5px;box-shadow:0 10px 28px rgba(0,0,0,.4);}' +
      '.feisttheme-option{display:flex;align-items:center;gap:8px;width:100%;background:transparent;' +
      'border:none;color:var(--ink,#ddd);font:inherit;font-size:.72rem;padding:6px 8px;border-radius:4px;' +
      'cursor:pointer;text-align:left;}' +
      '.feisttheme-option:hover{background:rgba(255,255,255,.06);}' +
      '.feisttheme-option.on{color:var(--accent,#c9a84c);}' +
      '.feisttheme-swatch{width:11px;height:11px;border-radius:50%;flex:none;' +
      'box-shadow:0 0 0 1px rgba(255,255,255,.25) inset;}';
    document.head.appendChild(style);
  }

  function buildWidget() {
    injectStyle();
    var wrap = document.createElement('div');
    wrap.className = 'feisttheme-widget';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'feisttheme-btn';
    btn.setAttribute('aria-label', 'Change theme');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '◐ Theme';

    var popover = document.createElement('div');
    popover.className = 'feisttheme-popover';
    popover.hidden = true;

    THEMES.forEach(function (t) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'feisttheme-option';
      opt.dataset.feisttheme = t.id;
      opt.setAttribute('data-feisttheme-swatch', '');
      if (t.id === get()) opt.classList.add('on');
      opt.innerHTML = '<span class="feisttheme-swatch" style="background:' + t.swatch + '"></span>' + t.label;
      opt.addEventListener('click', function () {
        set(t.id);
        popover.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      });
      popover.appendChild(opt);
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = popover.hidden;
      popover.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) { popover.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { popover.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });

    wrap.appendChild(btn);
    wrap.appendChild(popover);
    return wrap;
  }

  function mount(target) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    var widget = buildWidget();
    if (host) host.appendChild(widget);
    else document.body.appendChild(widget);
    return widget;
  }

  window.FeistTheme = { THEMES: THEMES, get: get, set: set, mount: mount };
})();
