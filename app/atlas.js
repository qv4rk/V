/* ─────────────────────────────────────────────────────────────
   THE ATLAS — main controller

   Boots the three modules (dial / earth / sky), wires time as
   the master variable across them, loads articles, renders the
   dossier on demand. View states:

     atrium  — large dial centered, "Enter Atlas" CTA
     atlas   — earth in middle, corner dial, article nodes
     sky     — full-bleed stereographic dome

   ───────────────────────────────────────────────────────────── */
window.MA = window.MA || {};

(function(MA){
  'use strict';

  const THEMES = ['patina','cyan','imperial','night'];
  const SAMPLE_LOCATIONS = [
    { name:'JERUSALEM',     lat:31.7683, lon: 35.2137 },
    { name:'ROME',          lat:41.9028, lon: 12.4964 },
    { name:'LONDON',        lat:51.5074, lon:  -0.1278 },
    { name:'BEIJING',       lat:39.9042, lon: 116.4074 },
    { name:'WASHINGTON',    lat:38.9072, lon: -77.0369 },
    { name:'CONSTANTINOPLE',lat:41.0082, lon: 28.9784 },
    { name:'CAIRO',         lat:30.0444, lon: 31.2357 },
    { name:'BABYLON',       lat:32.5364, lon: 44.4214 },
    { name:'ANTIKYTHERA',   lat:35.8675, lon: 23.3056 }
  ];

  /* ── Tiny markdown renderer (sufficient for our content) ── */
  function mdToHtml(md) {
    if (!md) return '';
    // Escape HTML
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const lines = md.split('\n');
    const out = [];
    let inPara = false;
    const closePara = () => { if (inPara) { out.push('</p>'); inPara = false; } };
    for (const ln of lines) {
      const t = ln.trim();
      if (!t) { closePara(); continue; }
      if (/^# /.test(t))      { closePara(); out.push('<h1>' + esc(t.slice(2)) + '</h1>'); continue; }
      if (/^## /.test(t))     { closePara(); out.push('<h2>' + esc(t.slice(3)) + '</h2>'); continue; }
      if (/^### /.test(t))    { closePara(); out.push('<h3>' + esc(t.slice(4)) + '</h3>'); continue; }
      // Inline emphasis
      let html = esc(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+?)`/g, '<code>$1</code>')
        .replace(/—/g, '—');
      if (!inPara) { out.push('<p>'); inPara = true; }
      else         { out.push(' '); }
      out.push(html);
    }
    closePara();
    return out.join('');
  }

  function fmtArticleDate(d) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const y = d.year;
    const era = y < 1 ? ' BCE' : (y < 1000 ? ' CE' : '');
    return `${String(d.day||1).padStart(2,'0')} ${months[(d.month||1)-1]} ${Math.abs(y < 1 ? y - 1 : y)}${era}`;
  }

  /* ── Boolean full-text search ──────────────────────────────
     Google-style syntax: implicit AND between bare terms, explicit
     OR creates alternative match groups, NOT / a leading "-" negates
     the next term, "quoted phrases" match as exact substrings.
     No parentheses/nesting — deliberately simple. ── */
  function parseBooleanQuery(q) {
    const tokens = [];
    const re = /"([^"]+)"|(\S+)/g;
    let m;
    while ((m = re.exec(q || ''))) {
      if (m[1] !== undefined) tokens.push({ phrase: m[1].toLowerCase() });
      else tokens.push({ word: m[2] });
    }
    const groups = [[]];
    let pendingNeg = false;
    for (const t of tokens) {
      if (t.phrase !== undefined) {
        groups[groups.length - 1].push({ term: t.phrase, neg: pendingNeg });
        pendingNeg = false;
        continue;
      }
      const upper = t.word.toUpperCase();
      if (upper === 'OR') { groups.push([]); pendingNeg = false; continue; }
      if (upper === 'AND') { pendingNeg = false; continue; }
      if (upper === 'NOT') { pendingNeg = true; continue; }
      let w = t.word, neg = pendingNeg;
      if (w.startsWith('-') && w.length > 1) { neg = true; w = w.slice(1); }
      pendingNeg = false;
      if (!w) continue;
      groups[groups.length - 1].push({ term: w.toLowerCase(), neg });
    }
    return groups.filter(g => g.length);
  }

  function articleHaystack(a) {
    return [
      a.title, a.excerpt, a.content, a.type, a.empire,
      (a.location && a.location.name), (a.tags || []).join(' '),
      (a.mechanism || []).join(' ')
    ].filter(Boolean).join(' \n ').toLowerCase();
  }

  // true if the article matches ANY OR-group where EVERY term in that
  // group is satisfied (present, or absent if negated)
  function matchesQuery(haystack, groups) {
    if (!groups.length) return true;
    return groups.some(group => group.every(({ term, neg }) => {
      const has = haystack.includes(term);
      return neg ? !has : has;
    }));
  }

  /* ══════════════════════════════════════════════════════════
     ManifoldAtlas
     ══════════════════════════════════════════════════════════ */
  class ManifoldAtlas {
    constructor() {
      this.view = 'atrium';
      this.theme = localStorage.getItem('feisttech-theme') || 'patina';
      this.jd = MA.jd(new Date());
      this.playing = false;
      this.speed = 30; // days per frame when playing
      this.articles = [];
      this.activeArticle = null;
      this.observerName = 'JERUSALEM';
      // navContext describes how the reader got to the currently open
      // article, so Prev/Next can follow either strict chronology or
      // the order of an active search's results.
      this.navContext = null;   // { kind:'chrono'|'search', order:[ids], query }
      this._openingFromHistory = false;

      this._applyTheme(this.theme);
      this._wireChrome();
      this._wireDial();
      this._wireEarth();
      this._wireSky();
      this._wireDossier();
      this._wireDossierNav();
      this._wireHistory();
      this._wireTimebar();
      this._wireKeyboard();
      this._wireShare();
      this._restoreFromURL();
      this.loadArticles();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
      window.addEventListener('resize', () => this._onResize());
      // Catches state that changes continuously (playback, dragging the
      // globe, zooming the sky) without hammering replaceState on every
      // animation frame — explicit calls elsewhere cover the discrete
      // actions (opening a node, changing view, jumping to a date) instantly.
      setInterval(() => this._syncURL(), 1000);
    }

    /* ── Shareable URL: date, view, earth rotation, sky zoom, and
       (via the existing #node-id hash) any open dossier. Always
       replaceState, never pushState, so this never creates its own
       back-button entries — openArticle()/closeArticle() already own
       that via the reading-trail history. ── */
    _syncURL() {
      const params = new URLSearchParams();
      params.set('jd', this.jd.toFixed(2));
      params.set('view', this.view);
      if (this.earth && Array.isArray(this.earth.rotation)) {
        params.set('rot', this.earth.rotation.slice(0, 2).map(n => n.toFixed(1)).join(','));
      }
      if (this.sky && typeof this.sky.zoom === 'number') {
        params.set('zoom', this.sky.zoom.toFixed(2));
      }
      const url = window.location.pathname + '?' + params.toString() + window.location.hash;
      history.replaceState(history.state, '', url);
    }

    _restoreFromURL() {
      const params = new URLSearchParams(window.location.search);
      if (params.has('jd')) {
        const jd = parseFloat(params.get('jd'));
        if (!isNaN(jd)) this.setDate(jd);
      } else {
        // No shared date to restore -- still run setDate() once so the
        // HUD/dial/timebar actually populate with today's date instead
        // of sitting on their placeholder "-" until the user interacts.
        this.setDate(this.jd);
      }
      if (params.has('view')) {
        const v = params.get('view');
        if (v === 'atrium' || v === 'atlas' || v === 'sky') this.setView(v);
      }
      if (params.has('rot') && this.earth && Array.isArray(this.earth.rotation)) {
        const parts = params.get('rot').split(',').map(Number);
        if (parts.length === 2 && parts.every(n => !isNaN(n))) {
          this.earth.rotation[0] = parts[0];
          this.earth.rotation[1] = parts[1];
        }
      }
      if (params.has('zoom') && this.sky) {
        const z = parseFloat(params.get('zoom'));
        if (!isNaN(z)) this.sky.zoom = Math.max(0.45, Math.min(4, z));
      }
    }

    /* ── Share ── */
    _wireShare() {
      const btn = document.getElementById('share-btn');
      if (!btn) return;
      btn.addEventListener('click', () => {
        this._syncURL();
        const data = { title: document.title, text: 'The Atlas — ' + MA.fmtDate(this.jd), url: location.href };
        if (navigator.share) {
          navigator.share(data).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(location.href).then(() => {
            const original = btn.textContent;
            btn.textContent = '✓ Link copied';
            setTimeout(() => { btn.textContent = original; }, 1800);
          });
        }
        this._closeNavMenu();
      });
    }

    /* ── Theme ── */
    _applyTheme(t) {
      this.theme = t;
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('feisttech-theme', t);
      // Update swatches
      document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('on', s.dataset.theme === t);
      });
    }

    /* ── Chrome wiring (topbar) ── */
    _wireChrome() {
      // Persistent hamburger nav — toggle open/closed, close on outside
      // click, Escape, or after acting on any item inside it.
      const toggle = document.getElementById('nav-toggle');
      const menu = document.getElementById('chrome-menu');
      const openMenu = () => { menu.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); };
      const closeMenu = () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
      this._closeNavMenu = closeMenu;
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.contains('open') ? closeMenu() : openMenu();
      });
      document.addEventListener('click', (e) => {
        if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== toggle) closeMenu();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

      // View tabs
      document.querySelectorAll('.view-tabs button').forEach(b => {
        b.addEventListener('click', () => { this.setView(b.dataset.view); this._closeNavMenu(); });
      });
      // Theme picker
      document.querySelectorAll('.theme-swatch').forEach(s => {
        s.addEventListener('click', () => { this._applyTheme(s.dataset.theme); this._closeNavMenu(); });
      });
      // Jump-to-node dropdown
      const sel = document.getElementById('node-jump');
      if (sel) sel.addEventListener('change', () => {
        const art = this.articles.find(a => a.id === sel.value);
        if (art) {
          if (this.view !== 'atlas') this.setView('atlas');
          this.openArticle(art);
          this._closeNavMenu();
        }
        sel.value = '';
      });
      // Node search
      const searchEl  = document.getElementById('node-search');
      const clearBtn  = document.getElementById('node-search-clear');
      if (searchEl) {
        searchEl.addEventListener('input', () => this._applySearch(searchEl.value));
        searchEl.addEventListener('keydown', e => { if (e.key === 'Escape') { searchEl.value = ''; this._applySearch(''); } });
      }
      if (clearBtn) clearBtn.addEventListener('click', () => {
        if (searchEl) searchEl.value = '';
        this._applySearch('');
      });
    }

    /* ── Boolean full-text search ── searches title, excerpt, full
       body content, tags, location, empire and mechanism — not just
       tags. Supports "quoted phrases", OR, NOT / -exclude. Results
       stay in the list's existing chronological order; matches are
       recorded as this._activeSearchOrder so clicking a result opens
       the article with a "search" nav context instead of "chrono". ── */
    _applySearch(raw) {
      const query = raw.trim();
      const items = document.querySelectorAll('.nl-item');
      if (!query) {
        items.forEach(li => li.classList.remove('dim'));
        if (this.earth) this.earth.setHighlightFilter(null);
        this._activeSearchOrder = null;
        this._activeSearchQuery = null;
        return;
      }
      const groups = parseBooleanQuery(query);
      const matchIds = [];
      items.forEach(li => {
        const art = this.articles.find(a => a.id === li.dataset.id);
        if (!art) { li.classList.add('dim'); return; }
        const match = matchesQuery(articleHaystack(art), groups);
        li.classList.toggle('dim', !match);
        if (match) matchIds.push(art.id);
      });
      if (this.earth) this.earth.setHighlightFilter(new Set(matchIds));
      // Preserve chronological order among matches (nl-list is already
      // date-sorted) so Prev/Next through a search feels sequential.
      this._activeSearchOrder = matchIds;
      this._activeSearchQuery = query;
    }

    /* ── Dial wiring (atrium + corner) ── */
    _wireDial() {
      // Atrium dial
      this.atriumDial = new MA.AntikytheraDial(document.getElementById('atrium-dial'), 'atrium');
      this.atriumDial.onDateChange = (jd) => { this.setDate(jd); };

      // Corner dial
      const cornerHost = document.getElementById('corner-dial-svg');
      this.cornerDial = new MA.AntikytheraDial(cornerHost, 'corner');
      this.cornerDial.onDateChange = (jd) => { this.setDate(jd); };
      this.cornerDial.onClick = () => {
        // Cycle: atlas → sky → atlas
        this.setView(this.view === 'sky' ? 'atlas' : 'sky');
      };
      document.getElementById('corner-dial').addEventListener('dblclick', () => {
        // Quick return to atrium
        this.setView('atrium');
      });

      // Atrium "Enter" button
      document.getElementById('enter-btn').addEventListener('click', () => {
        this.setView('atlas');
      });
    }

    /* ── Earth wiring ── */
    _wireEarth() {
      this.earth = new MA.EarthGlobe(document.getElementById('earth-canvas'),
                                     () => this.theme);
      this.earth.onNodeClick = (n) => this.openArticle(n);
      this.earth.onNodeHover = (n, cx, cy) => this._handleNodeHover(n, cx, cy);
    }

    _handleNodeHover(n, cx, cy) {
      const tip = document.getElementById('node-tip');
      if (!n) { tip.classList.remove('on'); return; }
      tip.classList.add('on');
      tip.style.left = (cx) + 'px';
      tip.style.top  = (cy) + 'px';
      tip.querySelector('.nt-date').textContent  = fmtArticleDate(n.date);
      tip.querySelector('.nt-title').textContent = n.title;
      tip.querySelector('.nt-loc').textContent   = (n.location.name||'').toUpperCase();
    }

    /* ── Sky wiring ── */
    _wireSky() {
      this.sky = new MA.SkyDome(document.getElementById('sky-canvas'),
                                () => this.theme);
      // Persistent sky backdrop (always-on canvas behind the globe)
      const bgCv = document.getElementById('sky-bg');
      if (bgCv) {
        this.skyBg = new MA.SkyDome(bgCv, () => this.theme);
        this.skyBg.setMode('backdrop');
      }
      // Build location buttons
      const grid = document.getElementById('loc-grid');
      SAMPLE_LOCATIONS.forEach(loc => {
        const b = document.createElement('button');
        b.textContent = loc.name;
        b.dataset.name = loc.name;
        b.addEventListener('click', () => {
          this.sky.setObserver(loc.lat, loc.lon, loc.name);
          this.observerName = loc.name;
          grid.querySelectorAll('button').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        });
        if (loc.name === this.observerName) b.classList.add('on');
        grid.appendChild(b);
      });
    }

    /* ── Dossier wiring ── */
    _wireDossier() {
      document.getElementById('doss-close').addEventListener('click', () => {
        this.closeArticle();
      });
    }

    /* ── Prev/Next through the dossier's active nav context ── */
    _wireDossierNav() {
      const prevBtn = document.getElementById('doss-prev');
      const nextBtn = document.getElementById('doss-next');
      if (prevBtn) prevBtn.addEventListener('click', () => this._stepDossier(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => this._stepDossier(1));
    }

    _stepDossier(delta) {
      const ctx = this.navContext;
      if (!ctx || !this.activeArticle) return;
      const idx = ctx.order.indexOf(this.activeArticle.id);
      if (idx === -1) return;
      const nextId = ctx.order[idx + delta];
      if (!nextId) return;
      const art = this.articles.find(a => a.id === nextId);
      if (art) this.openArticle(art, { navContext: ctx });
    }

    _updateDossierNav() {
      const prevBtn = document.getElementById('doss-prev');
      const nextBtn = document.getElementById('doss-next');
      const label = document.getElementById('doss-nav-label');
      const ctx = this.navContext;
      if (!ctx || !this.activeArticle) {
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (label) label.textContent = '—';
        return;
      }
      const idx = ctx.order.indexOf(this.activeArticle.id);
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx === -1 || idx >= ctx.order.length - 1;
      if (label) {
        const kindLabel = ctx.kind === 'search'
          ? `SEARCH “${ctx.query}”`
          : 'CHRONOLOGICAL';
        label.textContent = idx === -1 ? kindLabel : `${idx + 1} / ${ctx.order.length} · ${kindLabel}`;
      }
    }

    /* ── History / deep links ──
       Opening an article pushes #node-{id} so the browser Back button
       steps back through the reading trail (and the Forward button
       steps forward again) instead of leaving the app entirely. The
       nav context (chronological vs. search-result order) travels
       inside the history state so Prev/Next keeps working after a
       back/forward jump. ── */
    _wireHistory() {
      window.addEventListener('popstate', (e) => {
        const state = e.state;
        if (state && state.articleId) {
          const art = this.articles.find(a => a.id === state.articleId);
          if (art) {
            this._openingFromHistory = true;
            this.openArticle(art, { navContext: state.navContext || null, skipPush: true });
            this._openingFromHistory = false;
            return;
          }
        }
        // No article in this history entry — close the dossier without
        // pushing a new entry (we're already navigating history).
        this._openingFromHistory = true;
        this.closeArticle({ skipPush: true });
        this._openingFromHistory = false;
      });
    }

    /* ── Time bar ── */
    _wireTimebar() {
      const slider = document.getElementById('date-slider');
      slider.addEventListener('input', e => {
        const v = parseFloat(e.target.value); // -3000..+1000 years from 2000
        const d = new Date(Date.UTC(2026, 0, 1));
        d.setUTCFullYear(2026 + v);
        this.setDate(MA.jd(d));
        this.playing = false;
        document.getElementById('play-btn').textContent = '▶';
      });

      // Exact date entry — a birthday, an eclipse, any specific day —
      // instead of only being able to scrub the slider to a whole year.
      // <input type="date"> can't represent BCE years, so it covers the
      // CE range; the slider still reaches the deep past.
      const dateInput = document.getElementById('date-input');
      if (dateInput) {
        dateInput.addEventListener('change', () => {
          if (!dateInput.value) return;
          const [y, m, d] = dateInput.value.split('-').map(Number);
          this.setDate(MA.ymdToJd(y, m, d));
          this.playing = false;
          document.getElementById('play-btn').textContent = '▶';
        });
      }

      document.getElementById('play-btn').addEventListener('click', () => {
        this.playing = !this.playing;
        document.getElementById('play-btn').textContent = this.playing ? '⏸' : '▶';
      });
      document.getElementById('now-btn').addEventListener('click', () => {
        this.setDate(MA.jd(new Date()));
      });
      document.querySelectorAll('[data-speed]').forEach(b => {
        b.addEventListener('click', () => {
          this.speed = parseFloat(b.dataset.speed);
          document.querySelectorAll('[data-speed]').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        });
      });
    }

    _wireKeyboard() {
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          if (document.querySelector('.dossier.on')) this.closeArticle();
          else if (this.view !== 'atrium') this.setView('atrium');
        }
        if (e.key === ' ' && this.view !== 'atrium') {
          e.preventDefault();
          this.playing = !this.playing;
          document.getElementById('play-btn').textContent = this.playing ? '⏸' : '▶';
        }
      });
    }

    /* ── Articles ── */
    async loadArticles() {
      try {
        const res = await fetch('data/events.json');
        this.articles = await res.json();
      } catch (e) {
        console.warn('Could not load events.json', e);
        this.articles = [];
      }
      this.earth.setNodes(this.articles);
      this._renderNodeList();
      // Deep-link: Manifold Atlas.html#node-{id}
      const hash = window.location.hash;
      if (hash && hash.startsWith('#node-')) {
        const nodeId = hash.slice(6);
        const art = this.articles.find(a => a.id === nodeId);
        if (art) {
          if (this.view === 'atrium') this.setView('atlas');
          // The browser already created a history entry for this page
          // load; attach our state to it (replace, don't push) so the
          // very next Back leaves the dossier rather than reloading it.
          setTimeout(() => {
            this.openArticle(art, { skipPush: true });
            history.replaceState({ articleId: art.id, navContext: this.navContext }, '', hash);
          }, 200);
          return;
        }
      }
      history.replaceState({ articleId: null, navContext: null }, '', window.location.pathname + window.location.search);
    }

    _renderNodeList() {
      const ul = document.getElementById('nl-list');
      ul.innerHTML = '';
      // Sort by date asc
      const sorted = [...this.articles].sort((a,b) => {
        const yd = a.date.year - b.date.year;
        if (yd !== 0) return yd;
        return (a.date.month||1) - (b.date.month||1);
      });
      // Dynamic count in node-list header
      const nlHead = document.querySelector('.node-list .nl-head');
      if (nlHead) nlHead.textContent = `DOSSIERS · ${this.articles.length} NODE${this.articles.length===1?'':'S'}`;
      // Canonical chronological order — the default Prev/Next context,
      // and the fallback context.order used by openArticle() whenever
      // no explicit navContext is passed in.
      this._chronoOrder = sorted.map(a => a.id);
      // Populate jump-to dropdown
      const sel = document.getElementById('node-jump');
      if (sel) {
        sel.innerHTML = '<option value="">◇ JUMP TO NODE…</option>';
        sorted.forEach(art => {
          const o = document.createElement('option');
          o.value = art.id;
          const yr = art.date.year;
          const era = yr < 1 ? ' BCE' : (yr < 1000 ? ' CE' : '');
          o.textContent = `${Math.abs(yr)}${era} — ${art.title.substring(0, 48)}`;
          sel.appendChild(o);
        });
      }
      sorted.forEach(art => {
        const li = document.createElement('div');
        li.className = 'nl-item';
        li.dataset.id = art.id;
        li.innerHTML = `
          <div class="nl-date">${fmtArticleDate(art.date)}</div>
          <div class="nl-title">${art.title}</div>
          <div class="nl-loc">${(art.location.name||'').toUpperCase()}</div>
        `;
        li.addEventListener('click', () => {
          // If a search is active, reading Prev/Next should walk the
          // filtered result set, not the full chronological list.
          const ctx = this._activeSearchOrder
            ? { kind: 'search', order: this._activeSearchOrder, query: this._activeSearchQuery }
            : { kind: 'chrono', order: this._chronoOrder, query: null };
          this.openArticle(art, { navContext: ctx });
        });
        ul.appendChild(li);
      });
    }

    openArticle(art, opts) {
      opts = opts || {};
      this.activeArticle = art;
      // Nav context: honor an explicit one (search results, or one
      // restored from history state); otherwise default to browsing
      // chronologically through every loaded article.
      this.navContext = opts.navContext || { kind: 'chrono', order: this._chronoOrder || [], query: null };

      this.earth.setActive(art);
      this.earth.setSpin(false);    // pause auto-spin once a dossier is open

      // Set dial to the article date
      const jd = MA.ymdToJd(art.date.year, art.date.month || 1, art.date.day || 1);
      this.setDate(jd);

      // Fly earth to it
      this.earth.flyTo(art.location.lat, art.location.lon);

      // Point both sky instances at the node location
      this.sky.setObserver(art.location.lat, art.location.lon, art.location.name.toUpperCase());
      if (this.skyBg) this.skyBg.setObserver(art.location.lat, art.location.lon, art.location.name.toUpperCase());

      // Populate dossier
      this._renderDossier(art);
      this._updateDossierNav();
      document.getElementById('dossier').classList.add('on');

      // Highlight in node list
      document.querySelectorAll('.nl-item').forEach(li => {
        li.classList.toggle('active', li.dataset.id === art.id);
      });

      // Push history so Back steps through the reading trail instead
      // of leaving the app.
      if (!opts.skipPush) {
        history.pushState({ articleId: art.id, navContext: this.navContext }, '', '#node-' + art.id);
      }
    }

    closeArticle(opts) {
      opts = opts || {};
      document.getElementById('dossier').classList.remove('on');
      if (!opts.skipPush && window.location.hash) {
        history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }

    _renderDossier(art) {
      const root = document.getElementById('dossier');
      root.querySelector('.classification').textContent = (art.type || 'archive').toUpperCase() + ' · ' + (art.tags || []).slice(0,2).join(' · ').toUpperCase();
      root.querySelector('.doss-title').textContent = art.title;

      const meta = root.querySelector('.meta-line');
      meta.innerHTML = `
        <span>DATE · <b>${fmtArticleDate(art.date)}</b></span>
        <span>LOCATION · <b>${(art.location.name||'').toUpperCase()}</b></span>
        <span>COORDS · <b>${art.location.lat.toFixed(2)}, ${art.location.lon.toFixed(2)}</b></span>
      `;
      // The excerpt scrolls away with the body instead of sitting in the
      // fixed header -- on a phone screen the header alone (buttons +
      // title + meta + excerpt) could eat over half the viewport, leaving
      // almost nothing for the article itself.
      const bodyEl = root.querySelector('.body');
      const excerptHtml = art.excerpt
        ? `<p class="doss-excerpt">${art.excerpt.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p>`
        : '';
      bodyEl.innerHTML = excerptHtml + mdToHtml(art.content || '');
      // Article link
      if (art.article_url) {
        const link = document.createElement('a');
        link.href = art.article_url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'article-link-btn';
        link.textContent = 'Read Full Article with TTS →';
        bodyEl.appendChild(link);
      }

      // Connections
      const chipsHost = root.querySelector('.conn-chips');
      chipsHost.innerHTML = '';
      const connHead = root.querySelector('.conn-head');
      if (art.connections && art.connections.length) {
        connHead.textContent = `LINKED — ${art.connections.length} ARTICLE${art.connections.length>1?'S':''}`;
        art.connections.forEach(cid => {
          const other = this.articles.find(a => a.id === cid);
          if (!other) return;
          const c = document.createElement('button');
          c.className = 'chip';
          c.textContent = other.title;
          c.addEventListener('click', () => this.openArticle(other));
          chipsHost.appendChild(c);
        });
      } else {
        connHead.textContent = 'NO LINKED ARTICLES';
      }

      // Scroll dossier body to top
      root.querySelector('.body').scrollTop = 0;
    }

    /* ── Master time setter ── */
    setDate(jdt) {
      this.jd = jdt;
      this.atriumDial.setDate(jdt);
      this.cornerDial.setDate(jdt);
      this.earth.setDate(jdt);
      this.sky.setDate(jdt);
      if (this.skyBg) this.skyBg.setDate(jdt);
      // Update timebar
      const slider = document.getElementById('date-slider');
      const d = MA.dj(jdt);
      const yr = d.getUTCFullYear();
      slider.value = yr - 2026;
      const dateInput = document.getElementById('date-input');
      if (dateInput && yr >= 1) {
        // <input type="date"> only accepts CE years — leave it blank for
        // BCE dates rather than showing something wrong.
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        dateInput.value = `${String(yr).padStart(4, '0')}-${mm}-${dd}`;
      } else if (dateInput) {
        dateInput.value = '';
      }
      document.getElementById('date-display').textContent = MA.fmtDate(jdt);
      document.getElementById('hud-date').textContent = MA.fmtDate(jdt);
      document.getElementById('hud-year').textContent = yr < 1 ? `${Math.abs(yr-1)} BCE` : `${yr} CE`;
      // Eclipse marker
      const eclipse = MA.eclipseProximity(jdt);
      document.getElementById('hud-eclipse').textContent = eclipse ? '◐ ECLIPSE WINDOW' : '—';
      document.getElementById('hud-eclipse').classList.toggle('warn', eclipse);

      // Atrium readout
      const ar = document.getElementById('atrium-date');
      if (ar) ar.textContent = MA.fmtDate(jdt);
    }

    /* ── View transitions ── */
    setView(v) {
      if (v === this.view) return;
      this.view = v;
      document.querySelectorAll('.view').forEach(el => {
        el.classList.toggle('on', el.id === v);
      });
      document.querySelectorAll('.view-tabs button').forEach(b => {
        b.classList.toggle('on', b.dataset.view === v);
      });
      // Corner dial is redundant with Atrium's own hero dial, so it stays
      // hidden there — but the hamburger nav (#chrome-bar) is now
      // persistent across all three views, Atrium included.
      document.getElementById('corner-dial').style.display = (v === 'atrium' ? 'none' : 'block');
      document.querySelectorAll('.atlas-only').forEach(el => {
        el.style.display = (v === 'atlas' ? '' : 'none');
      });
      document.querySelectorAll('.sky-only').forEach(el => {
        el.style.display = (v === 'sky' ? '' : 'none');
      });
      // Sky: interactive first-person dome in sky view; silent backdrop everywhere else
      const skyCv = document.getElementById('sky-canvas');
      if (v === 'sky') {
        if (skyCv) skyCv.classList.add('interactive');
        this.sky.setMode('full');
      } else {
        if (skyCv) skyCv.classList.remove('interactive');
        this.sky.setMode('backdrop');
      }
      // Resize on transition (canvases may have been hidden)
      requestAnimationFrame(() => this._onResize());
    }

    _onResize() {
      if (this.earth)  this.earth.resize();
      if (this.sky)    this.sky.resize();
      if (this.skyBg)  this.skyBg.resize();
    }

    /* ── Main loop ── */
    _loop() {
      requestAnimationFrame(this._loop);
      // Advance time when playing
      if (this.playing && this.view !== 'atrium') {
        this.setDate(this.jd + this.speed);
      }
      // Sky backdrop renders ALWAYS — it's the background of the whole site
      if (this.skyBg) this.skyBg.render();
      // Then the active foreground view
      if (this.view === 'atlas') this.earth.render();
      if (this.view === 'sky')   this.sky.render();
      // Atrium is SVG — no per-frame render needed (dial updates on setDate)
    }
  }

  MA.ManifoldAtlas = ManifoldAtlas;

})(window.MA);
