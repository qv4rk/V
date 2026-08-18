/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Antikythera Triplicity Dial
   A purpose-built companion to The Atlas's dial: instead of
   tracking a Julian date, this dial reads the D4 Root/Element roll and
   sweeps its pointer to that element's triplicity across the twelve
   zodiac wedges, giving the cardinal, fixed and mutable signs a soft
   glow — with the mutable sign (the traditional point of culmination:
   Sagittarius, Virgo, Gemini, Pisces) receiving the deepest emphasis.
   ───────────────────────────────────────────────────────────── */

window.ER = window.ER || {};

(function (ER) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function deg2rad(d) { return (d * Math.PI) / 180; }

  const GLYPH = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
  };

  class TriplicityDial {
    constructor(container) {
      this.container = container;
      this.size = 420;
      this.cx = this.size / 2;
      this.cy = this.size / 2;
      this.currentElement = null;
      this._build();
    }

    _build() {
      this.container.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${this.size} ${this.size}`, class: 'dial-svg' }, this.container);
      this.svg = svg;

      const defs = el('defs', {}, svg);
      const glow = el('filter', { id: 'er-dial-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
      el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 5, result: 'b' }, glow);
      const fm = el('feMerge', {}, glow);
      el('feMergeNode', { in: 'b' }, fm);
      el('feMergeNode', { in: 'SourceGraphic' }, fm);

      const plate = el('radialGradient', { id: 'er-dial-plate', cx: '50%', cy: '45%', r: '65%' }, defs);
      el('stop', { offset: '0%', 'stop-color': '#0f1330' }, plate);
      el('stop', { offset: '70%', 'stop-color': '#0a0a1a' }, plate);
      el('stop', { offset: '100%', 'stop-color': '#050510' }, plate);

      const R = this.size * 0.46;

      // Outer patina ring
      el('circle', { cx: this.cx, cy: this.cy, r: R, fill: 'url(#er-dial-plate)', stroke: 'rgba(0,243,255,0.25)', 'stroke-width': 1.5 }, svg);
      el('circle', { cx: this.cx, cy: this.cy, r: R - 8, fill: 'none', stroke: 'rgba(188,19,254,0.18)', 'stroke-width': 1 }, svg);

      // Fine tick ring (like a gear edge)
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * 2 * Math.PI;
        const r1 = R - 3, r2 = R;
        el('line', {
          x1: this.cx + Math.cos(a) * r1, y1: this.cy + Math.sin(a) * r1,
          x2: this.cx + Math.cos(a) * r2, y2: this.cy + Math.sin(a) * r2,
          stroke: 'rgba(0,243,255,0.35)', 'stroke-width': i % 10 === 0 ? 1.4 : 0.6
        }, svg);
      }

      // Twelve zodiac wedges
      this.wedgeG = el('g', { class: 'dial-wedges' }, svg);
      this.wedges = {};
      const N = 12;
      const wedgeR1 = R * 0.52, wedgeR2 = R * 0.86;
      ER.ZODIAC.forEach((sign, i) => {
        const a0 = (i / N) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / N) * 2 * Math.PI - Math.PI / 2;
        const x0 = this.cx + Math.cos(a0) * wedgeR1, y0 = this.cy + Math.sin(a0) * wedgeR1;
        const x1 = this.cx + Math.cos(a0) * wedgeR2, y1 = this.cy + Math.sin(a0) * wedgeR2;
        const x2 = this.cx + Math.cos(a1) * wedgeR2, y2 = this.cy + Math.sin(a1) * wedgeR2;
        const x3 = this.cx + Math.cos(a1) * wedgeR1, y3 = this.cy + Math.sin(a1) * wedgeR1;
        const path = el('path', {
          d: `M ${x0} ${y0} L ${x1} ${y1} A ${wedgeR2} ${wedgeR2} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${wedgeR1} ${wedgeR1} 0 0 0 ${x0} ${y0} Z`,
          fill: 'rgba(255,255,255,0.02)',
          stroke: 'rgba(255,255,255,0.08)',
          'stroke-width': 0.75,
          class: 'dial-wedge',
          'data-sign': sign
        }, this.wedgeG);

        const amid = (a0 + a1) / 2;
        const glyphR = (wedgeR1 + wedgeR2) / 2;
        const gx = this.cx + Math.cos(amid) * glyphR;
        const gy = this.cy + Math.sin(amid) * glyphR;
        const glyphText = el('text', {
          x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
          class: 'dial-glyph', 'font-size': 18
        }, this.wedgeG);
        glyphText.textContent = GLYPH[sign] || sign[0];

        this.wedges[sign] = { path, glyphText, angleMid: amid };
      });

      // Inner static rings (decorative, patina)
      el('circle', { cx: this.cx, cy: this.cy, r: wedgeR1 - 6, fill: 'none', stroke: 'rgba(0,243,255,0.15)', 'stroke-width': 1 }, svg);
      el('circle', { cx: this.cx, cy: this.cy, r: R * 0.22, fill: 'none', stroke: 'rgba(188,19,254,0.2)', 'stroke-width': 1 }, svg);

      // Element label ring center
      this.centerLabel = el('text', {
        x: this.cx, y: this.cy - 4, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        class: 'dial-center-label'
      }, svg);
      this.centerLabel.textContent = 'AWAITING ROOT';

      this.centerSub = el('text', {
        x: this.cx, y: this.cy + 16, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        class: 'dial-center-sub'
      }, svg);
      this.centerSub.textContent = 'roll to entangle';

      // Pointer / hand, resting at top (Aries) until set
      const handG = el('g', { class: 'dial-hand-group', filter: 'url(#er-dial-glow)' }, svg);
      this.handG = handG;
      el('line', {
        x1: this.cx, y1: this.cy, x2: this.cx, y2: this.cy - (wedgeR2 + 6),
        stroke: '#00f3ff', 'stroke-width': 2.5, 'stroke-linecap': 'round', class: 'dial-hand'
      }, handG);
      el('circle', { cx: this.cx, cy: this.cy, r: 6, fill: '#00f3ff', class: 'dial-hub' }, handG);

      this._resetWedgeStyles();
    }

    _resetWedgeStyles() {
      Object.values(this.wedges).forEach(({ path, glyphText }) => {
        path.setAttribute('fill', 'rgba(255,255,255,0.02)');
        path.setAttribute('stroke', 'rgba(255,255,255,0.08)');
        path.removeAttribute('filter');
        glyphText.setAttribute('opacity', '0.45');
      });
    }

    /* Sweep the pointer + highlight a triplicity for a given element
       key: 'fire' | 'water' | 'air' | 'earth' */
    setElement(elementKey) {
      const trip = ER.TRIPLICITY[elementKey];
      if (!trip) return;
      this.currentElement = elementKey;
      this._resetWedgeStyles();

      trip.signs.forEach((sign) => {
        const w = this.wedges[sign];
        if (!w) return;
        const isMutable = sign === trip.mutable;
        w.path.setAttribute('fill', isMutable ? this._alpha(trip.color, 0.38) : this._alpha(trip.color, 0.16));
        w.path.setAttribute('stroke', this._alpha(trip.color, isMutable ? 0.9 : 0.5));
        w.glyphText.setAttribute('opacity', isMutable ? '1' : '0.8');
        if (isMutable) w.path.setAttribute('filter', 'url(#er-dial-glow)');
      });

      // sweep the hand to the mutable (culminating) sign, with a
      // satisfying overshoot-and-settle, like a gear catching a tooth.
      const targetAngle = (this.wedges[trip.mutable].angleMid * 180) / Math.PI;
      this._sweepTo(targetAngle);

      this.centerLabel.textContent = trip.mutable.toUpperCase();
      this.centerLabel.style.fill = trip.color;
      this.centerSub.textContent = elementKey.toUpperCase() + ' TRIPLICITY';
    }

    _alpha(hex, a) {
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }

    _sweepTo(targetDeg) {
      // Normalize current rotation, then animate with a slight overshoot.
      const from = this._currentRot || 0;
      let to = targetDeg + 90; // SVG 0deg is +x axis; our wedge 0 is at top (-90)
      // shortest path but always spin at least 300deg for ritual drama
      let delta = to - from;
      delta = ((delta % 360) + 360) % 360;
      if (delta < 300) delta += 360;
      const finalRot = from + delta;
      const overshoot = finalRot + 14;

      this.handG.style.transition = 'none';
      this.handG.style.transformOrigin = `${this.cx}px ${this.cy}px`;
      this.handG.style.transform = `rotate(${from}deg)`;
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      this.handG.getBoundingClientRect();

      this.handG.style.transition = 'transform 1.35s cubic-bezier(.2,.9,.25,1.04)';
      this.handG.style.transform = `rotate(${overshoot}deg)`;

      clearTimeout(this._settleTimer);
      this._settleTimer = setTimeout(() => {
        this.handG.style.transition = 'transform 0.4s ease-out';
        this.handG.style.transform = `rotate(${finalRot}deg)`;
        this._currentRot = finalRot % 360;
      }, 1370);
    }

    reset() {
      this._resetWedgeStyles();
      this.centerLabel.textContent = 'AWAITING ROOT';
      this.centerLabel.style.fill = '';
      this.centerSub.textContent = 'roll to entangle';
    }
  }

  ER.TriplicityDial = TriplicityDial;

})(window.ER);
