/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Living Vector Map
   Two adjacent SVG panels driven by the D8 Vector roll:
     1. The Lo Shu 3×3 magic square, in its traditional placement
        (4-9-2 / 3-5-7 / 8-1-6 — every line, row, column and
        diagonal summing to 15).
     2. An Etruscan Templum — the augur's sky, quartered into
        NE / SE / SW / NW by the cardo and decumanus lines.
   Both panels highlight in response to the same roll and are
   individually clickable for a short lore pop.
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

  // Traditional Lo Shu placement, row-major, top row first.
  // Direction/trigram per definitions.js d8 faces.
  const LOSHU_GRID = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6]
  ];

  function findFaceByLoshu(n) {
    const faces = ER.DICE_DEFINITIONS.d8.faces;
    for (const k of Object.keys(faces)) {
      if (faces[k].loshu === n) return faces[k];
    }
    return null;
  }

  class LoShuSquare {
    constructor(container, onCellClick) {
      this.container = container;
      this.onCellClick = onCellClick;
      this.cells = {};
      this._build();
    }

    _build() {
      this.container.innerHTML = '';
      const size = 300;
      const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, class: 'loshu-svg' }, this.container);
      const pad = 18, cellSize = (size - pad * 2) / 3;

      const defs = el('defs', {}, svg);
      const glow = el('filter', { id: 'er-loshu-glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, defs);
      el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 4, result: 'b' }, glow);
      const fm = el('feMerge', {}, glow);
      el('feMergeNode', { in: 'b' }, fm);
      el('feMergeNode', { in: 'SourceGraphic' }, fm);

      // connecting lines suggesting the magic-sum lattice (rows/cols/diagonals)
      const latticeG = el('g', { class: 'loshu-lattice', opacity: 0.18 }, svg);
      for (let i = 1; i < 3; i++) {
        el('line', { x1: pad, y1: pad + i * cellSize, x2: size - pad, y2: pad + i * cellSize, stroke: '#00f3ff', 'stroke-width': 1 }, latticeG);
        el('line', { x1: pad + i * cellSize, y1: pad, x2: pad + i * cellSize, y2: size - pad, stroke: '#00f3ff', 'stroke-width': 1 }, latticeG);
      }
      el('line', { x1: pad, y1: pad, x2: size - pad, y2: size - pad, stroke: '#bc13fe', 'stroke-width': 1 }, latticeG);
      el('line', { x1: size - pad, y1: pad, x2: pad, y2: size - pad, stroke: '#bc13fe', 'stroke-width': 1 }, latticeG);

      LOSHU_GRID.forEach((row, ri) => {
        row.forEach((num, ci) => {
          const x = pad + ci * cellSize, y = pad + ri * cellSize;
          const g = el('g', { class: 'loshu-cell', 'data-num': num, role: 'button', tabindex: '0' }, svg);
          const rect = el('rect', {
            x: x + 3, y: y + 3, width: cellSize - 6, height: cellSize - 6, rx: 8,
            fill: num === 5 ? 'rgba(200,180,255,0.06)' : 'rgba(255,255,255,0.02)',
            stroke: num === 5 ? 'rgba(200,180,255,0.35)' : 'rgba(255,255,255,0.12)',
            'stroke-width': 1.2
          }, g);
          const text = el('text', {
            x: x + cellSize / 2, y: y + cellSize / 2 + 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
            class: 'loshu-num'
          }, g);
          text.textContent = num;

          const face = findFaceByLoshu(num);
          const sub = el('text', {
            x: x + cellSize / 2, y: y + cellSize - 12, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
            class: 'loshu-sub'
          }, g);
          sub.textContent = face ? face.direction : '·';

          g.addEventListener('click', () => this.onCellClick && this.onCellClick(num, face));
          g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onCellClick && this.onCellClick(num, face); } });

          this.cells[num] = { g, rect, text };
        });
      });
    }

    reset() {
      Object.values(this.cells).forEach(({ rect }) => {
        rect.removeAttribute('filter');
        rect.setAttribute('stroke-width', 1.2);
      });
    }

    highlight(loshuNumber) {
      this.reset();
      const cell = this.cells[loshuNumber];
      if (!cell) return;
      cell.rect.setAttribute('fill', 'rgba(0,243,255,0.22)');
      cell.rect.setAttribute('stroke', '#00f3ff');
      cell.rect.setAttribute('stroke-width', 2.2);
      cell.rect.setAttribute('filter', 'url(#er-loshu-glow)');
    }
  }

  class EtruscanTemplum {
    constructor(container, onQuadrantClick) {
      this.container = container;
      this.onQuadrantClick = onQuadrantClick;
      this.quads = {};
      this._build();
    }

    _build() {
      this.container.innerHTML = '';
      const size = 300, cx = size / 2, cy = size / 2, r = size * 0.42;
      const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, class: 'templum-svg' }, this.container);

      const defs = el('defs', {}, svg);
      const glow = el('filter', { id: 'er-templum-glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, defs);
      el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 5, result: 'b' }, glow);
      const fm = el('feMerge', {}, glow);
      el('feMergeNode', { in: 'b' }, fm);
      el('feMergeNode', { in: 'SourceGraphic' }, fm);

      el('circle', { cx, cy, r, fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(0,243,255,0.25)', 'stroke-width': 1.4 }, svg);

      const quadDefs = [
        { key: 'NE', a0: -90, a1: 0 },
        { key: 'SE', a0: 0, a1: 90 },
        { key: 'SW', a0: 90, a1: 180 },
        { key: 'NW', a0: 180, a1: 270 }
      ];

      quadDefs.forEach(({ key, a0, a1 }) => {
        const p0 = this._pt(cx, cy, r, a0), p1 = this._pt(cx, cy, r, a1);
        const path = el('path', {
          d: `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`,
          fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(255,255,255,0.1)', 'stroke-width': 0.75,
          role: 'button', tabindex: '0', 'data-quad': key
        }, svg);
        const amid = deg2rad((a0 + a1) / 2);
        const lx = cx + Math.cos(amid) * r * 0.62, ly = cy + Math.sin(amid) * r * 0.62;
        const label = el('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'templum-label' }, svg);
        label.textContent = key;

        path.addEventListener('click', () => this.onQuadrantClick && this.onQuadrantClick(key));
        path.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onQuadrantClick && this.onQuadrantClick(key); } });

        this.quads[key] = { path, label };
      });

      // cardo (N-S) and decumanus (E-W) lines
      el('line', { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: '#bc13fe', 'stroke-width': 1, opacity: 0.4 }, svg);
      el('line', { x1: cx - r, y1: cy, x2: cx + r, y2: cy, stroke: '#bc13fe', 'stroke-width': 1, opacity: 0.4 }, svg);
      el('circle', { cx, cy, r: 4, fill: '#bc13fe' }, svg);

      function deg2rad(d) { return (d * Math.PI) / 180; }
    }

    _pt(cx, cy, r, deg) {
      const a = (deg * Math.PI) / 180;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    }

    reset() {
      Object.values(this.quads).forEach(({ path }) => {
        path.setAttribute('fill', 'rgba(255,255,255,0.02)');
        path.removeAttribute('filter');
      });
    }

    highlight(quadKey) {
      this.reset();
      const q = this.quads[quadKey];
      if (!q) return;
      q.path.setAttribute('fill', 'rgba(188,19,254,0.22)');
      q.path.setAttribute('filter', 'url(#er-templum-glow)');
    }
  }

  ER.LoShuSquare = LoShuSquare;
  ER.EtruscanTemplum = EtruscanTemplum;

  /* Convenience: build both panels and wire them to a single D8 roll. */
  ER.buildVectorMap = function (loshuContainer, templumContainer, onLore) {
    const loshu = new LoShuSquare(loshuContainer, (num, face) => {
      if (onLore && face) onLore({ title: `Lo Shu ${num} · ${face.direction}`, body: face.text });
    });
    const templum = new EtruscanTemplum(templumContainer, (quadKey) => {
      const faces = Object.values(ER.DICE_DEFINITIONS.d8.faces).filter(f => f.quadrant === quadKey);
      const names = faces.map(f => f.name).join(' & ');
      if (onLore) onLore({ title: `Templum ${quadKey}`, body: `This quadrant of the augur's sky holds ${names} — ${faces.map(f => f.keyword).join(' · ')}.` });
    });
    return {
      loshu, templum,
      setFromD8(faceValue) {
        const face = ER.DICE_DEFINITIONS.d8.faces[faceValue];
        if (!face) return;
        loshu.highlight(face.loshu);
        templum.highlight(face.quadrant);
      },
      reset() { loshu.reset(); templum.reset(); }
    };
  };

})(window.ER);
