/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Orchestration
   Starfield, screen flow, roll ritual, results dashboard, thread
   canvas, history/library, PDF/share actions.
   ───────────────────────────────────────────────────────────── */

(function (ER) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const DIE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

  const state = {
    dice: null,
    dial: null,
    vectorMap: null,
    reading: null,       // the in-progress / active reading object
    threadsVisible: true
  };

  /* ═══════════════════════ Starfield canvas ═══════════════════════ */

  function initStarfield() {
    const canvas = $('#starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars, nebulae;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(220, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        baseA: Math.random() * 0.6 + 0.2,
        tw: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.02 + 0.004) * (Math.random() < 0.5 ? 1 : -1)
      }));
      nebulae = [
        { x: w * 0.2, y: h * 0.25, r: Math.max(w, h) * 0.35, color: 'rgba(188,19,254,0.05)' },
        { x: w * 0.8, y: h * 0.7, r: Math.max(w, h) * 0.4, color: 'rgba(0,243,255,0.04)' }
      ];
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#05050c';
      ctx.fillRect(0, 0, w, h);
      nebulae.forEach(n => {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });
      stars.forEach(s => {
        const a = reduceMotion ? s.baseA : s.baseA + Math.sin(t * 0.001 + s.tw) * 0.25;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = '#eaf6ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduceMotion) {
          s.x += s.speed;
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
        }
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawFrame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(drawFrame);

    ER._starfieldBurst = function (x, y) {
      // a soft "wave collapse" particle burst at (x,y), page coords
      const n = 18;
      const burstCanvas = canvas;
      const rect = burstCanvas.getBoundingClientRect();
      const cx = x - rect.left, cy = y - rect.top;
      const particles = Array.from({ length: n }, () => ({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1
      }));
      function step() {
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.life -= 0.02;
          if (p.life > 0) {
            ctx.globalAlpha = p.life * 0.8;
            ctx.fillStyle = Math.random() < 0.5 ? '#00f3ff' : '#bc13fe';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
        if (particles.some(p => p.life > 0)) requestAnimationFrame(step);
      }
      step();
    };
  }

  /* ═══════════════════════ Screen flow ═══════════════════════ */

  function showScreen(name) {
    $$('.screen').forEach(s => s.classList.add('hidden'));
    const el = $('#screen-' + name);
    if (el) {
      el.classList.remove('hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const heading = $('h1, h2', el);
      if (heading) heading.setAttribute('tabindex', '-1'), heading.focus({ preventScroll: true });
    }
    document.body.dataset.screen = name;
  }

  /* ═══════════════════════ Toasts ═══════════════════════ */

  function toast(msg) {
    const region = $('#toast-region');
    if (!region) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    region.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--in'));
    setTimeout(() => {
      t.classList.remove('toast--in');
      setTimeout(() => t.remove(), 300);
    }, 3200);
  }

  /* ═══════════════════════ Lore modal ═══════════════════════ */

  function showLore({ title, body }) {
    const modal = $('#lore-modal');
    $('#lore-modal-title').textContent = title;
    $('#lore-modal-body').textContent = body;
    modal.classList.remove('hidden');
    $('#lore-modal-close').focus();
  }
  function hideLore() {
    $('#lore-modal').classList.add('hidden');
  }

  /* ═══════════════════════ Dice grid setup ═══════════════════════ */

  function buildDiceGrid() {
    const containerMap = {};
    DIE_ORDER.forEach(key => { containerMap[key] = $('#die-' + key); });
    state.dice = ER.dice.buildAll(containerMap);
    DIE_ORDER.forEach(key => {
      const die = state.dice[key];
      if (!die) return;
      die.container.addEventListener('click', () => {
        if (die.rolling) return;
        ER.dice.rollOne(state.dice, key);
      });
      die.container.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !die.rolling) {
          e.preventDefault();
          ER.dice.rollOne(state.dice, key);
        }
      });
    });
  }

  /* ═══════════════════════ Headline synthesis ═══════════════════════ */

  const HEADLINE_TEMPLATES = [
    (r) => `${r.d4.name} has met ${r.d20.name} in your ${r.d6.name.toLowerCase()} — the threads are deliciously entangled.`,
    (r) => `Somewhere between ${r.d8.name} and ${r.d12.name}, your eigenstate just became a little more alive.`,
    (r) => `${r.d10.name} arrives wearing ${r.d4.keyword}'s colors. The Grid has spoken.`,
    (r) => `Today's collapse: ${r.d4.name} energy, routed through ${r.d8.keyword}, resolving toward ${r.d20.name}.`,
    (r) => `The dice agree: this is a ${r.d12.name} kind of ${r.d6.name.toLowerCase()}, lit from underneath by ${r.d4.keyword}.`
  ];

  function synthesizeHeadline(faces, rolls) {
    const idx = (rolls.d6 + rolls.d10) % HEADLINE_TEMPLATES.length;
    return HEADLINE_TEMPLATES[idx](faces);
  }

  function facesFromRolls(rolls) {
    const faces = {};
    DIE_ORDER.forEach(key => { faces[key] = ER.DICE_DEFINITIONS[key].faces[rolls[key]]; });
    return faces;
  }

  /* ═══════════════════════ Results dashboard rendering ═══════════════════════ */

  function firstSentence(text) {
    const m = text.match(/^.*?[.!?](?:\s|$)/);
    return m ? m[0].trim() : text;
  }

  function renderResults(reading) {
    const rolls = reading.rolls;
    const faces = facesFromRolls(rolls);

    $('#headline-text').textContent = reading.headline;
    $('#result-seeker').textContent = reading.clientName || 'Anonymous Seeker';
    $('#result-question').textContent = reading.question || '(no question recorded)';
    $('#result-date').textContent = reading.dateStr;

    // Summary cards
    const grid = $('#summary-grid');
    grid.innerHTML = '';
    DIE_ORDER.forEach(key => {
      const def = ER.DICE_DEFINITIONS[key];
      const face = faces[key];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'facet-card';
      card.setAttribute('aria-expanded', 'false');
      card.dataset.key = key;
      card.innerHTML = `
        <div class="facet-card-head">
          <span class="facet-die-badge">d${def.sides}</span>
          <span class="facet-die-label">${def.label}</span>
        </div>
        <div class="facet-name">${face.name}</div>
        <div class="facet-keyword">${face.keyword || ''}</div>
        <p class="facet-teaser">${firstSentence(face.text)}</p>
        <span class="facet-expand-hint">tap to expand ↓</span>
      `;
      card.addEventListener('click', () => toggleFacetDetail(key, card));
      grid.appendChild(card);
    });

    // Detail panels (accordion, collapsed by default)
    const details = $('#detail-panels');
    details.innerHTML = '';
    DIE_ORDER.forEach(key => {
      const def = ER.DICE_DEFINITIONS[key];
      const face = faces[key];
      const panel = document.createElement('div');
      panel.className = 'facet-detail hidden';
      panel.id = 'detail-' + key;
      const termsHtml = (face.echo && face.echo.terms || []).map(t =>
        `<span class="echo-term"><span class="echo-script">${t.script}</span><span class="echo-translit">${t.translit}</span><span class="echo-lang">${t.lang}</span><span class="echo-gloss">${t.gloss}</span></span>`
      ).join('');
      panel.innerHTML = `
        <h3>${def.label} · ${face.name} <span class="facet-detail-roll">d${def.sides} → ${rolls[key]}</span></h3>
        <p class="facet-detail-text">${face.text}</p>
        <div class="facet-overlay">
          <h4>Quantum Vector Overlay</h4>
          <p>${face.overlay}</p>
        </div>
        ${face.echo ? `
        <details class="cultural-echo">
          <summary>Cultural Echo</summary>
          <div class="echo-terms">${termsHtml}</div>
          <p class="echo-note">${face.echo.note}</p>
        </details>` : ''}
      `;
      details.appendChild(panel);
    });

    // Dial + Vector Map
    if (state.dial) state.dial.setElement(faces.d4.element);
    if (state.vectorMap) state.vectorMap.setFromD8(rolls.d8);

    drawThreadCanvas(faces, rolls);
  }

  function toggleFacetDetail(key, card) {
    const panel = $('#detail-' + key);
    const isOpen = !panel.classList.contains('hidden');
    // collapse all
    $$('.facet-detail').forEach(p => p.classList.add('hidden'));
    $$('.facet-card').forEach(c => c.setAttribute('aria-expanded', 'false'));
    if (!isOpen) {
      panel.classList.remove('hidden');
      card.setAttribute('aria-expanded', 'true');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ═══════════════════════ Thread entanglement canvas ═══════════════════════ */

  function drawThreadCanvas(faces, rolls) {
    const canvas = $('#thread-canvas');
    if (!canvas || !state.threadsVisible) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
    const nodes = DIE_ORDER.map((key, i) => {
      const a = (i / DIE_ORDER.length) * Math.PI * 2 - Math.PI / 2;
      return { key, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, val: rolls[key], sides: ER.DICE_DEFINITIONS[key].sides };
    });

    // connective threads: every pair, thickness/opacity from normalized roll harmony
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const normA = a.val / a.sides, normB = b.val / b.sides;
        const harmony = 1 - Math.abs(normA - normB); // 0..1, higher = more resonant
        ctx.beginPath();
        const midx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 6;
        const midy = (a.y + b.y) / 2 + (Math.random() - 0.5) * 6;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midx, midy, b.x, b.y);
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `rgba(0,243,255,${0.08 + harmony * 0.35})`);
        grad.addColorStop(1, `rgba(188,19,254,${0.08 + harmony * 0.35})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.4 + harmony * 2.2;
        ctx.stroke();
      }
    }

    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#eaf6ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(200,210,224,0.85)';
      ctx.font = '10px "Roboto Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.key, n.x, n.y - 12);
    });
  }

  /* ═══════════════════════ Roll ritual ═══════════════════════ */

  function readForm() {
    return {
      clientName: $('#input-seeker').value.trim(),
      question: $('#input-question').value.trim(),
      dateStr: $('#input-date').value || new Date().toISOString().slice(0, 10)
    };
  }

  async function performReading(seedData, opts) {
    opts = opts || {};
    const btns = [$('#btn-entangle'), $('#btn-random-roll')].filter(Boolean);
    btns.forEach(b => { b.disabled = true; });
    const original = $('#btn-entangle').textContent;
    $('#btn-entangle').textContent = 'COLLAPSING THE WAVEFUNCTION…';

    if (opts.burstOrigin) ER._starfieldBurst(opts.burstOrigin.x, opts.burstOrigin.y);

    const rolls = await ER.dice.rollAll(state.dice);
    const faces = facesFromRolls(rolls);
    const headline = synthesizeHeadline(faces, rolls);

    const reading = Object.assign({}, seedData, { rolls, headline });
    state.reading = reading;

    btns.forEach(b => { b.disabled = false; });
    $('#btn-entangle').textContent = original;

    renderResults(reading);
    showScreen('results');
    toast('The threads have settled. Your eigenstate is alive with possibility.');
  }

  function onEntangleClick(e) {
    const seed = readForm();
    if (!seed.question) toast('Speak your intent, even briefly — the threads listen better when named.');
    performReading(seed, { burstOrigin: { x: e.clientX, y: e.clientY } });
  }

  function onRandomFluctuation(e) {
    const seed = readForm();
    if (!seed.clientName) seed.clientName = 'A Curious Wanderer';
    if (!seed.question) seed.question = 'What does the universe want me to know right now?';
    if (!seed.dateStr) seed.dateStr = new Date().toISOString().slice(0, 10);
    performReading(seed, { burstOrigin: { x: e.clientX, y: e.clientY } });
  }

  /* ═══════════════════════ History / library ═══════════════════════ */

  function renderHistory(filter) {
    const list = $('#history-list');
    const items = filter ? ER.storage.search(filter) : ER.storage.list();
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<p class="history-empty">Your grimoire is empty. Readings you save will live here.</p>';
      return;
    }
    items.forEach(r => {
      const li = document.createElement('div');
      li.className = 'history-item';
      const d = new Date(r.createdAt);
      li.innerHTML = `
        <div class="history-item-main">
          <div class="history-item-name">${r.clientName || 'Anonymous Seeker'}</div>
          <div class="history-item-headline">${r.headline || ''}</div>
          <div class="history-item-date">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="history-item-actions">
          <button class="btn-icon" data-action="load" title="Load reading">↩</button>
          <button class="btn-icon" data-action="delete" title="Delete reading">✕</button>
        </div>
      `;
      li.querySelector('[data-action="load"]').addEventListener('click', () => {
        state.reading = r;
        renderResults(r);
        showScreen('results');
        closeHistory();
      });
      li.querySelector('[data-action="delete"]').addEventListener('click', () => {
        ER.storage.remove(r.id);
        renderHistory($('#history-search').value);
        toast('Reading released from the grimoire.');
      });
      list.appendChild(li);
    });
  }

  function openHistory() {
    $('#history-panel').classList.remove('hidden');
    $('#history-panel').classList.add('history-panel--open');
    renderHistory();
    $('#history-search').focus();
  }
  function closeHistory() {
    $('#history-panel').classList.remove('history-panel--open');
    setTimeout(() => $('#history-panel').classList.add('hidden'), 250);
  }

  /* ═══════════════════════ Action bar ═══════════════════════ */

  function onSaveLibrary() {
    if (!state.reading) return;
    const saved = ER.storage.save(state.reading);
    state.reading = saved;
    toast('Saved to your private grimoire.');
  }

  async function onExportPdf() {
    if (!state.reading) return;
    toast('Binding your reading into a keepsake…');
    await ER.exportPdf(state.reading, {
      loshuSvg: $('#loshu-container svg'),
      templumSvg: $('#templum-container svg')
    });
  }

  async function onShare() {
    if (!state.reading) return;
    const r = state.reading;
    const faces = facesFromRolls(r.rolls);
    const text = `EIGENSTATE ROLL\n${r.clientName || 'Anonymous Seeker'} — ${r.dateStr}\n"${r.question || ''}"\n\n${r.headline}\n\n` +
      DIE_ORDER.map(k => `${ER.DICE_DEFINITIONS[k].label}: ${faces[k].name} (d${ER.DICE_DEFINITIONS[k].sides} → ${r.rolls[k]})`).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Eigenstate Roll', text }); } catch (e) { /* user cancelled */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast('Reading copied to clipboard.');
    } else {
      toast('Sharing is not supported in this browser.');
    }
  }

  function onNewReading() {
    state.reading = null;
    DIE_ORDER.forEach(k => state.dice[k] && state.dice[k].reset());
    if (state.dial) state.dial.reset();
    if (state.vectorMap) state.vectorMap.reset();
    $('#reading-form').reset();
    $('#input-date').value = new Date().toISOString().slice(0, 10);
    showScreen('input');
  }

  /* ═══════════════════════ Wire-up ═══════════════════════ */

  function init() {
    initStarfield();
    buildDiceGrid();

    state.dial = new ER.TriplicityDial($('#dial-container'));
    state.vectorMap = ER.buildVectorMap($('#loshu-container'), $('#templum-container'), showLore);

    $('#input-date').value = new Date().toISOString().slice(0, 10);

    $('#btn-begin').addEventListener('click', () => showScreen('input'));
    $('#btn-fluctuation').addEventListener('click', onRandomFluctuation);
    $('#btn-entangle').addEventListener('click', onEntangleClick);
    $('#btn-random-roll').addEventListener('click', onRandomFluctuation);
    $('#btn-back-landing').addEventListener('click', () => showScreen('landing'));

    $('#btn-toggle-threads').addEventListener('click', () => {
      state.threadsVisible = !state.threadsVisible;
      const wrap = $('#thread-canvas-wrap');
      wrap.classList.toggle('hidden', !state.threadsVisible);
      if (state.threadsVisible && state.reading) {
        drawThreadCanvas(facesFromRolls(state.reading.rolls), state.reading.rolls);
      }
    });

    $('#btn-save-library').addEventListener('click', onSaveLibrary);
    $('#btn-export-pdf').addEventListener('click', onExportPdf);
    $('#btn-share').addEventListener('click', onShare);
    $('#btn-new-reading').addEventListener('click', onNewReading);

    $('#history-fab').addEventListener('click', openHistory);
    $('#history-close').addEventListener('click', closeHistory);
    $('#history-search').addEventListener('input', (e) => renderHistory(e.target.value));

    $('#lore-modal-close').addEventListener('click', hideLore);
    $('#lore-modal').addEventListener('click', (e) => { if (e.target.id === 'lore-modal') hideLore(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hideLore(); closeHistory(); }
      if (e.key.toLowerCase() === 'n' && document.body.dataset.screen === 'results' && !isTyping(e)) onNewReading();
    });

    window.addEventListener('resize', () => {
      if (state.reading && state.threadsVisible) drawThreadCanvas(facesFromRolls(state.reading.rolls), state.reading.rolls);
    });

    showScreen('landing');
  }

  function isTyping(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.ER);
