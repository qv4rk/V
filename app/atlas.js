/* ─────────────────────────────────────────────────────────────
   MANIFOLD ATLAS — main controller

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

  /* ══════════════════════════════════════════════════════════
     ManifoldAtlas
     ══════════════════════════════════════════════════════════ */
  class ManifoldAtlas {
    constructor() {
      this.view = 'atrium';
      this.theme = localStorage.getItem('ma-theme') || 'patina';
      this.jd = MA.jd(new Date());
      this.playing = false;
      this.speed = 30; // days per frame when playing
      this.articles = [];
      this.activeArticle = null;
      this.observerName = 'JERUSALEM';

      this._applyTheme(this.theme);
      this._wireChrome();
      this._wireDial();
      this._wireEarth();
      this._wireSky();
      this._wireDossier();
      this._wireTimebar();
      this._wireKeyboard();
      this.loadArticles();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
      window.addEventListener('resize', () => this._onResize());
    }

    /* ── Theme ── */
    _applyTheme(t) {
      this.theme = t;
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('ma-theme', t);
      // Update swatches
      document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('on', s.dataset.theme === t);
      });
    }

    /* ── Chrome wiring (topbar) ── */
    _wireChrome() {
      // View tabs
      document.querySelectorAll('.view-tabs button').forEach(b => {
        b.addEventListener('click', () => this.setView(b.dataset.view));
      });
      // Theme picker
      document.querySelectorAll('.theme-swatch').forEach(s => {
        s.addEventListener('click', () => this._applyTheme(s.dataset.theme));
      });
      // Jump-to-node dropdown
      const sel = document.getElementById('node-jump');
      if (sel) sel.addEventListener('change', () => {
        const art = this.articles.find(a => a.id === sel.value);
        if (art) {
          if (this.view !== 'atlas') this.setView('atlas');
          this.openArticle(art);
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

    /* ── Boolean tag/content search ── */
    _applySearch(raw) {
      const terms = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const items = document.querySelectorAll('.nl-item');
      if (!terms.length) {
        items.forEach(li => li.classList.remove('dim'));
        if (this.earth) this.earth.setHighlightFilter(null);
        return;
      }
      const matchIds = new Set();
      items.forEach(li => {
        const art = this.articles.find(a => a.id === li.dataset.id);
        if (!art) { li.classList.add('dim'); return; }
        const blob = [
          art.title, art.excerpt, art.type,
          (art.tags || []).join(' '),
          (art.mechanism || []).join(' '),
          (art.empire || ''),
          (art.content || ''),
          (art.location && art.location.name) || '',
        ].join(' ').toLowerCase();
        const match = terms.every(t => blob.includes(t));
        li.classList.toggle('dim', !match);
        if (match) matchIds.add(art.id);
      });
      if (this.earth) this.earth.setHighlightFilter(matchIds);
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
          setTimeout(() => this.openArticle(art), 200);
        }
      }
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
        li.addEventListener('click', () => this.openArticle(art));
        ul.appendChild(li);
      });
    }

    openArticle(art) {
      this.activeArticle = art;
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
      document.getElementById('dossier').classList.add('on');

      // Highlight in node list
      document.querySelectorAll('.nl-item').forEach(li => {
        li.classList.toggle('active', li.dataset.id === art.id);
      });
    }

    closeArticle() {
      document.getElementById('dossier').classList.remove('on');
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
      root.querySelector('.excerpt').textContent = art.excerpt || '';
      const bodyEl = root.querySelector('.body');
      bodyEl.innerHTML = mdToHtml(art.content || '');
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
      // Show corner dial + chrome when not in atrium
      document.getElementById('corner-dial').style.display = (v === 'atrium' ? 'none' : 'block');
      document.querySelectorAll('.atlas-only').forEach(el => {
        el.style.display = (v === 'atlas' ? '' : 'none');
      });
      document.querySelectorAll('.sky-only').forEach(el => {
        el.style.display = (v === 'sky' ? '' : 'none');
      });
      document.getElementById('chrome-bar').style.display = (v === 'atrium' ? 'none' : '');
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
