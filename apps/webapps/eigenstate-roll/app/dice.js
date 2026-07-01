/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Dice engine
   Simulated SVG polyhedra + two separate randomness paths:

     ER.rng.rollDie(sides)     — the AUTHORITATIVE roll.
                                 crypto.getRandomValues() with
                                 rejection sampling (no modulo bias).
                                 This is the only source of truth for
                                 the actual reading.

     ER.rng.visualRandom()     — a small xorshift128 PRNG seeded from
                                 whatever passive interaction entropy
                                 the page has collected (pointer/touch
                                 deltas + performance.now() timings).
                                 Used ONLY to drive the cosmetic number
                                 cycling during the tumble animation —
                                 never consulted for the real result.

   SECURITY NOTE — read before "improving" this file:
   Browsers (and Android WebView especially) do not expose stable,
   zero-permission, high-entropy sensors to a web page. There is no
   legitimate way to read the accelerometer, true device jitter, or
   anything else that would require a permission prompt, and this app
   deliberately never asks for one — the ritual has to stay a private,
   frictionless, zero-permission experience. So the "living seed" here
   is intentionally modest: mouse/touch movement deltas and timing
   jitter, mixed into a PRNG that only ever touches the *visual* tumble.
   crypto.getRandomValues() remains solely responsible for the number
   that actually gets read into the reading. Do not wire visualRandom()
   into anything that touches the result.
   ───────────────────────────────────────────────────────────── */

window.ER = window.ER || {};

(function (ER) {
  'use strict';

  /* ═══════════════ Authoritative randomness (crypto) ═══════════════ */

  const rng = {};

  // Unbiased random integer in [0, maxExclusive) via rejection sampling.
  rng.secureInt = function (maxExclusive) {
    if (maxExclusive <= 0) return 0;
    const range = 256;
    if (maxExclusive > range) throw new Error('secureInt: maxExclusive too large for byte sampling');
    const limit = range - (range % maxExclusive);
    const buf = new Uint8Array(1);
    let v;
    do {
      crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % maxExclusive;
  };

  // Roll an N-sided die -> integer in [1, sides].
  rng.rollDie = function (sides) {
    return rng.secureInt(sides) + 1;
  };

  /* ═══════════════ Visual-only entropy-seeded PRNG ═══════════════ */

  // xorshift128 state, seeded with crypto (never left at a fixed seed)
  // then continuously re-mixed with passive interaction entropy.
  const seedBuf = new Uint32Array(4);
  crypto.getRandomValues(seedBuf);
  let sx = seedBuf[0] || 0x9e3779b9;
  let sy = seedBuf[1] || 0x243f6a88;
  let sz = seedBuf[2] || 0xb7e15162;
  let sw = seedBuf[3] || 0x85ebca6b;

  function xorshift128() {
    let t = sx ^ (sx << 11);
    t ^= t >>> 8;
    sx = sy; sy = sz; sz = sw;
    sw = (sw ^ (sw >>> 19)) ^ (t ^ (t >>> 8));
    return (sw >>> 0);
  }

  rng.visualRandom = function () {
    return xorshift128() / 4294967296;
  };

  rng.visualInt = function (maxExclusive) {
    return Math.floor(rng.visualRandom() * maxExclusive);
  };

  // Passive entropy harvest: pointer/touch movement deltas + timing.
  // Zero permissions requested; nothing beyond ordinary page events.
  let lastX = null, lastY = null, lastT = null;
  function mix(a, b, c) {
    sx ^= (a * 2654435761) >>> 0;
    sy ^= (b * 2246822519) >>> 0;
    sz ^= (c * 3266489917) >>> 0;
    sw = (sw + ((sx ^ sy ^ sz) >>> 0)) >>> 0;
    xorshift128(); // burn one to diffuse
  }
  function onPointerEntropy(x, y) {
    const t = performance.now();
    if (lastX !== null) {
      const dx = x - lastX, dy = y - lastY, dt = t - lastT;
      mix((dx * 1000) | 0, (dy * 1000) | 0, (dt * 1000) | 0);
    }
    lastX = x; lastY = y; lastT = t;
  }
  window.addEventListener('pointermove', (e) => onPointerEntropy(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) onPointerEntropy(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('click', () => mix(performance.now() | 0, Math.random() * 1e6 | 0, Date.now() | 0));

  ER.rng = rng;

  /* ═══════════════════════ SVG die shapes ═══════════════════════ */
  // Flat stylized "face" per die type, viewBox 0 0 100 100.
  // Each is a single polygon standing in for the die — a ritual
  // object, not a literal render of a 3D solid.

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const SHAPES = {
    tetrahedron: '50,8 92,88 8,88',                                   // d4  — triangle
    cube: '18,18 82,18 82,82 18,82',                                  // d6  — square
    octahedron: '50,6 94,50 50,94 6,50',                              // d8  — diamond
    'pentagonal-trapezohedron': '50,6 84,34 74,90 26,90 16,34',       // d10 — kite/pentagon
    dodecahedron: '50,4 92,36 76,90 24,90 8,36',                      // d12 — pentagon
    icosahedron: '50,5 90,27 90,73 50,95 10,73 10,27'                 // d20 — hexagon
  };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  let glowIdCounter = 0;

  function buildDieSVG(shapeKey) {
    const gid = 'die-glow-' + (glowIdCounter++);
    const svg = el('svg', { viewBox: '0 0 100 100', class: 'die-svg' });
    const defs = el('defs', {}, svg);
    const filt = el('filter', { id: gid, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 2.6, result: 'b' }, filt);
    const fm = el('feMerge', {}, filt);
    el('feMergeNode', { in: 'b' }, fm);
    el('feMergeNode', { in: 'SourceGraphic' }, fm);

    const grad = el('linearGradient', { id: gid + '-fill', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
    el('stop', { offset: '0%', 'stop-color': 'var(--die-fill-a, #0a0e1e)' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'var(--die-fill-b, #14102a)' }, grad);

    const poly = el('polygon', {
      points: SHAPES[shapeKey] || SHAPES.cube,
      fill: `url(#${gid}-fill)`,
      stroke: 'var(--die-stroke, #00f3ff)',
      'stroke-width': 1.6,
      'stroke-linejoin': 'round',
      filter: `url(#${gid})`
    }, svg);

    const text = el('text', {
      x: 50, y: 56, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      class: 'die-number', 'font-family': "'Orbitron', sans-serif"
    }, svg);
    text.textContent = '?';

    return { svg, poly, text };
  }

  /* ═══════════════════════ Die controller ═══════════════════════ */

  class Die {
    constructor(container, def) {
      this.container = container;
      this.def = def; // { key, sides, label, subtitle, shape }
      this.value = null;
      this.rolling = false;
      this._build();
    }

    _build() {
      this.container.innerHTML = '';
      this.container.classList.add('die', `die--${this.def.key}`);
      this.container.setAttribute('role', 'button');
      this.container.setAttribute('tabindex', '0');
      this.container.setAttribute('aria-label', `${this.def.label}, d${this.def.sides}. Not yet rolled.`);

      const wrap = document.createElement('div');
      wrap.className = 'die-wrap';
      const { svg, text } = buildDieSVG(this.def.shape);
      this.svgText = text;
      wrap.appendChild(svg);
      this.container.appendChild(wrap);

      const cap = document.createElement('div');
      cap.className = 'die-caption';
      cap.innerHTML = `<span class="die-caption-label">${this.def.label}</span><span class="die-caption-sub">d${this.def.sides} · ${this.def.subtitle}</span>`;
      this.container.appendChild(cap);

      this.wrap = wrap;
    }

    setDisplay(v) {
      this.svgText.textContent = v;
    }

    /* Play a tumble animation and land on `finalValue`.
       Visual number cycling uses the entropy-seeded PRNG only —
       the finalValue itself must already have been produced by
       ER.rng.rollDie() before this is called. */
    tumble(finalValue, opts) {
      opts = opts || {};
      const durationMs = opts.duration || (900 + ER.rng.visualInt(500));
      this.rolling = true;
      this.container.classList.add('die--rolling');
      this.wrap.style.setProperty('--spin-duration', durationMs + 'ms');

      // random-ish 3D spin target using visual entropy, tasteful range
      const rx = 340 + ER.rng.visualInt(400);
      const ry = 340 + ER.rng.visualInt(400);
      const rz = (ER.rng.visualInt(60) - 30);
      this.wrap.style.setProperty('--spin-x', rx + 'deg');
      this.wrap.style.setProperty('--spin-y', ry + 'deg');
      this.wrap.style.setProperty('--spin-z', rz + 'deg');
      this.wrap.classList.add('tumbling');

      const start = performance.now();
      const sides = this.def.sides;
      const cycle = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / durationMs);
        if (t < 1) {
          // ease-out cycling: fast at first, slows near landing
          this.setDisplay(1 + ER.rng.visualInt(sides));
          const delay = 30 + t * t * 160;
          this._cycleTimer = setTimeout(cycle, delay);
        } else {
          this._land(finalValue);
        }
      };
      cycle();

      return new Promise((resolve) => { this._resolveTumble = resolve; });
    }

    _land(finalValue) {
      clearTimeout(this._cycleTimer);
      this.value = finalValue;
      this.setDisplay(finalValue);
      this.wrap.classList.remove('tumbling');
      this.container.classList.remove('die--rolling');
      this.container.classList.add('die--landed', 'die--flash');
      this.container.setAttribute('aria-label', `${this.def.label}, d${this.def.sides}. Rolled ${finalValue}.`);
      setTimeout(() => this.container.classList.remove('die--flash'), 650);
      this.rolling = false;
      if (this._resolveTumble) { this._resolveTumble(finalValue); this._resolveTumble = null; }
    }

    reset() {
      this.value = null;
      this.setDisplay('?');
      this.container.classList.remove('die--landed', 'die--rolling', 'die--flash');
    }
  }

  ER.Die = Die;

  ER.dice = {
    /* Build all six dice into the given container map:
       { d4: el, d6: el, d8: el, d10: el, d12: el, d20: el } */
    buildAll(containerMap) {
      const dice = {};
      for (const key of Object.keys(ER.DICE_DEFINITIONS)) {
        const def = ER.DICE_DEFINITIONS[key];
        const container = containerMap[key];
        if (!container) continue;
        dice[key] = new Die(container, def);
      }
      return dice;
    },

    /* Roll every die in `dice` (object of Die instances), staggering
       the tumble starts slightly for a more organic, ritual feel.
       Returns { key: finalValue, ... } once all have landed. */
    async rollAll(dice) {
      const order = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
      const results = {};
      const promises = [];
      let stagger = 0;
      for (const key of order) {
        const die = dice[key];
        if (!die) continue;
        const finalValue = ER.rng.rollDie(die.def.sides);
        results[key] = finalValue;
        const p = new Promise((resolve) => {
          setTimeout(() => { die.tumble(finalValue).then(resolve); }, stagger);
        });
        promises.push(p);
        stagger += 90;
      }
      await Promise.all(promises);
      return results;
    },

    /* Roll a single die by key, in place. */
    async rollOne(dice, key) {
      const die = dice[key];
      if (!die) return null;
      const finalValue = ER.rng.rollDie(die.def.sides);
      await die.tumble(finalValue);
      return finalValue;
    }
  };

})(window.ER);
