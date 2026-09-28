/* FeistTech shared shell.
 *
 *   <script src="/site.js" defer></script>                 full bar (content pages)
 *   <script src="/site.js" data-mode="tab" defer></script> small top tab (full-screen apps)
 *   <script src="/site.js" data-mode="attach" defer></script> the page's own [data-ft-menu]
 *                                                            element opens the menu
 *
 * Adds the directory menu (Read / Explore / Tools) and a search palette
 * (⌘K, Ctrl+K or /) that covers every tool and every article.
 */
(function () {
  if (window.__ftShell) return;
  window.__ftShell = true;

  var script = document.currentScript;
  var mode = (script && script.dataset.mode) || 'bar';

  var SECTIONS = [
    { title: 'Read', items: [
      ['Reading Room', '/reader/', 'Every article, with voice and speed reading'],
      ['All articles', '/articles/', 'The full archive'],
      ['Hoffect', '/hoffect/', 'Oncology research dossier'],
    ]},
    { title: 'Explore', items: [
      ['The Atlas', '/atlas/', 'Globe to street: every article on one map'],
      ['Gaza damage', '/gaza/', 'Building-level damage over time'],
      ['The Great GASPI', '/gaspi/', 'West Bank and Gaza territories'],
      ['Sky & time dial', '/sky/', 'The original Manifold Atlas'],
    ]},
    { title: 'Tools', items: [
      ['Methionine', '/methionine/', 'Meal builder and tracker'],
      ['Natal chart', '/natal/', 'Planet positions for any birth sky'],
      ['Eigenstate Roll', '/eigenstate/', 'Dice and probability oracle'],
      ['Signature Trends', '/trends/', 'Category and geography trends'],
      ['Solar System', '/solsys/', '3D orbital model'],
      ['Kaleidoscope studio', '/omniscope/', 'Omniscope, hologram, font forges'],
      ['Gallery', '/gallery/', 'Generative art'],
    ]},
  ];

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var css = el('link', { rel: 'stylesheet', href: '/site.css' });
  document.head.appendChild(css);

  var here = location.pathname.replace(/index\.html$/, '');

  // ── Menu ──
  var menu = el('nav', { class: 'ft-menu', id: 'ft-menu', 'aria-label': 'Site directory' });
  menu.innerHTML = SECTIONS.map(function (s) {
    return '<div><h3>' + s.title + '</h3>' + s.items.map(function (i) {
      var cur = here === i[1] ? ' aria-current="page"' : '';
      return '<a href="' + i[1] + '"' + cur + '>' + esc(i[0]) + '<small>' + esc(i[2]) + '</small></a>';
    }).join('') + '</div>';
  }).join('');

  // ── Search ──
  var search = el('div', { class: 'ft-search', role: 'dialog', 'aria-label': 'Search' },
    '<div class="ft-search-box"><input type="search" placeholder="Search articles and tools…" autocomplete="off" aria-label="Search">' +
    '<ul class="ft-results"></ul></div>');
  var input = search.querySelector('input');
  var results = search.querySelector('.ft-results');

  var index = [];
  SECTIONS.forEach(function (s) {
    s.items.forEach(function (i) { index.push({ t: i[0], d: i[2], u: i[1], k: s.title }); });
  });
  var articlesLoaded = false;
  function loadArticles() {
    if (articlesLoaded) return;
    articlesLoaded = true;
    fetch('/data/events.json').then(function (r) { return r.json(); }).then(function (evs) {
      evs.forEach(function (e) {
        index.push({ t: e.title, d: (e.location && e.location.name) || '', u: '/articles/' + e.id + '.html', k: 'Article', x: (e.tags || []).join(' ') });
      });
      render();
    }).catch(function () {});
  }

  var sel = 0, shown = [];
  function render() {
    var q = input.value.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean);
    shown = index.filter(function (it) {
      var hay = (it.t + ' ' + it.d + ' ' + (it.x || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    }).slice(0, 40);
    sel = Math.min(sel, Math.max(shown.length - 1, 0));
    results.innerHTML = shown.length ? shown.map(function (it, n) {
      return '<li><a href="' + it.u + '"' + (n === sel ? ' class="sel"' : '') + '><span>' + esc(it.t) + '</span><small>' + esc(it.k) + '</small></a></li>';
    }).join('') : '<li class="ft-empty">Nothing matches “' + esc(q) + '”.</li>';
  }

  function openSearch() {
    closeMenu();
    loadArticles();
    search.classList.add('open');
    input.value = '';
    sel = 0;
    render();
    setTimeout(function () { input.focus(); }, 0);
  }
  function closeSearch() { search.classList.remove('open'); }

  input.addEventListener('input', function () { sel = 0; render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && shown[sel]) { location.href = shown[sel].u; }
  });
  search.addEventListener('click', function (e) { if (e.target === search) closeSearch(); });

  // ── Bar, tab, or the page's own trigger ──
  var trigger = mode === 'attach' && document.querySelector('[data-ft-menu]');
  if (mode === 'bar') {
    var bar = el('header', { class: 'ft-bar' },
      '<a class="ft-brand" href="/">FEISTTECH</a>' +
      '<button class="ft-link" aria-controls="ft-menu" aria-expanded="false">Menu</button>' +
      '<a class="ft-link ft-sec" href="/reader/">Read</a>' +
      '<a class="ft-link ft-sec" href="/atlas/">Atlas</a>' +
      '<span class="ft-spacer"></span>' +
      '<button class="ft-searchbtn" data-ft-search aria-label="Search">⌕ <span class="ft-label">Search</span> <span class="ft-kbd">/</span></button>');
    document.body.insertBefore(bar, document.body.firstChild);
    trigger = bar.querySelector('[aria-controls]');
  } else {
    if (!trigger) {
      trigger = el('button', { class: 'ft-tab' }, 'FEISTTECH ▾');
      document.body.appendChild(trigger);
      menu.style.left = '50%';
      menu.style.transform = 'translateX(-50%)';
      menu.style.top = '32px';
    }
    trigger.setAttribute('aria-controls', 'ft-menu');
    trigger.setAttribute('aria-expanded', 'false');
    menu.appendChild(el('div', { style: 'grid-column:1/-1;display:flex;gap:16px;border-top:1px solid var(--ft-line);padding-top:10px;margin-top:4px' },
      '<a href="/">Home</a><a href="#" data-ft-search>Search</a>'));
  }
  document.body.appendChild(menu);
  document.body.appendChild(search);

  function closeMenu() { menu.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
  trigger.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-ft-search]');
    if (s) { e.preventDefault(); openSearch(); return; }
    if (!menu.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); }
    else if (e.key === 'Escape') { closeSearch(); closeMenu(); }
  });

  window.FeistShell = { openSearch: openSearch };
})();
