/* ─────────────────────────────────────────────────────────────
   THE ATLAS — Antikythera Dial (SVG component)

   Two modes:
     - 'atrium' — full hero dial, all rings, planet hands, ornament
     - 'corner' — compact widget, zodiac + sun/moon + glow

   Constructed once; reads a JD via setDate().
   ───────────────────────────────────────────────────────────── */
window.MA = window.MA || {};

(function(MA){
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function deg2rad(d) { return d * Math.PI / 180; }

  /* ── Tick marks helper ── */
  function ticks(g, cx, cy, r1, r2, count, color, opacity, every5, every5color) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 2 * Math.PI - Math.PI/2;
      const x1 = cx + Math.cos(a)*r1, y1 = cy + Math.sin(a)*r1;
      const x2 = cx + Math.cos(a)*r2, y2 = cy + Math.sin(a)*r2;
      const isMajor = every5 && (i % every5 === 0);
      el('line', {
        x1, y1, x2: isMajor ? cx + Math.cos(a)*(r2 - (r2-r1)*0.4) : x2,
        y2: isMajor ? cy + Math.sin(a)*(r2 - (r2-r1)*0.4) : y2,
        stroke: isMajor ? (every5color || color) : color,
        'stroke-width': isMajor ? 1.1 : 0.6,
        'stroke-opacity': opacity
      }, g);
    }
  }

  function ringText(g, cx, cy, r, texts, color, fontSize, fontFamily, offsetDeg, rotateLetters) {
    const N = texts.length;
    texts.forEach((t, i) => {
      const angDeg = (i / N) * 360 + (offsetDeg||0);
      const a = deg2rad(angDeg - 90 + (180/N)); // center each segment
      const x = cx + Math.cos(a)*r;
      const y = cy + Math.sin(a)*r;
      const rot = rotateLetters ? (angDeg + (180/N)) : 0;
      const tx = el('text', {
        x, y,
        fill: color,
        'font-family': fontFamily || 'Cinzel, serif',
        'font-size': fontSize,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'letter-spacing': '0.18em',
        transform: rotateLetters ? `rotate(${rot} ${x} ${y})` : ''
      }, g);
      tx.textContent = t;
    });
  }

  /* ══════════════════════════════════════════════════════════
     AntikytheraDial
     ══════════════════════════════════════════════════════════ */
  class AntikytheraDial {
    constructor(container, mode) {
      this.container = container;
      this.mode = mode || 'atrium';
      this.jd = MA.jd(new Date());
      this.size = 1000;          // viewBox units
      this.center = this.size/2;
      this.dragging = false;
      this.lastAngle = null;
      this.onDateChange = null;  // callback(jd)
      this.onClick = null;       // callback() — for corner mode
      this._build();
    }

    _build() {
      this.container.innerHTML = '';
      this.svg = el('svg', {
        viewBox: `0 0 ${this.size} ${this.size}`,
        xmlns: SVG_NS
      }, this.container);

      // <defs> filters for glow
      const defs = el('defs', {}, this.svg);
      const glow = el('filter', { id:'dial-glow', x:'-50%', y:'-50%', width:'200%', height:'200%' }, defs);
      el('feGaussianBlur', { in:'SourceGraphic', stdDeviation:6, result:'b' }, glow);
      el('feMerge', {}, glow);
      const fm = glow.lastChild;
      el('feMergeNode', { in:'b' }, fm);
      el('feMergeNode', { in:'SourceGraphic' }, fm);

      // Background patina
      this.bgPlate = el('circle', {
        cx:this.center, cy:this.center, r:this.center*0.96,
        fill:'url(#dial-plate)', stroke:'currentColor',
        'stroke-opacity':0.25, 'stroke-width':1
      }, this.svg);

      // Plate gradient
      const grad = el('radialGradient', { id:'dial-plate', cx:'50%', cy:'45%', r:'70%' }, defs);
      el('stop', { offset:'0%',  'stop-color':'var(--bg-soft)' }, grad);
      el('stop', { offset:'70%', 'stop-color':'var(--bg)' },      grad);
      el('stop', { offset:'100%','stop-color':'var(--bg-deep)' }, grad);

      this.staticG  = el('g', { class:'dial-static' }, this.svg);
      this.zodiacG  = el('g', { class:'dial-zodiac' }, this.svg);
      this.handsG   = el('g', { class:'dial-hands' }, this.svg);
      this.ornG     = el('g', { class:'dial-ornament' }, this.svg);

      this._drawStatic();
      this._buildHands();
      this._buildInteraction();
      this.setDate(this.jd);
    }

    /* ── STATIC: outer ring (Egyptian calendar), Zodiac, decorative rings ── */
    _drawStatic() {
      const cx = this.center, cy = this.center, R = this.center*0.96;
      const g = this.staticG;

      const isAtrium = this.mode === 'atrium';
      const ringOuter   = R;
      const ringMid     = R * 0.86;
      const ringInner   = R * 0.66;
      const ringSaros   = R * 0.50;
      const hub         = R * 0.18;

      // Outer ring band (Egyptian calendar) — atrium only shows text
      el('circle', { cx, cy, r:ringOuter, fill:'none',
        stroke:'currentColor', 'stroke-opacity':0.30, 'stroke-width':1.2 }, g);
      el('circle', { cx, cy, r:ringMid,   fill:'none',
        stroke:'currentColor', 'stroke-opacity':0.35, 'stroke-width':1.5 }, g);
      el('circle', { cx, cy, r:ringInner, fill:'none',
        stroke:'currentColor', 'stroke-opacity':0.25, 'stroke-width':1 }, g);
      el('circle', { cx, cy, r:ringSaros, fill:'none',
        stroke:'currentColor', 'stroke-opacity':0.20, 'stroke-width':1 }, g);

      // Tick marks for days (Egyptian calendar = 365 ticks)
      const dayTicks = el('g', { stroke:'currentColor', 'stroke-opacity':0.5 }, g);
      ticks(dayTicks, cx, cy, ringMid, ringOuter,
            isAtrium ? 365 : 73, 'currentColor', 0.5, isAtrium ? 30 : 12, 'var(--accent)');

      // Zodiac tick marks (12 segments, with 5-degree subticks)
      ticks(g, cx, cy, ringInner, ringMid, 12, 'var(--accent)', 0.85);
      if (isAtrium) {
        ticks(g, cx, cy, ringInner+8, ringMid-8, 72, 'currentColor', 0.25);
        ticks(g, cx, cy, ringInner+5, ringMid-5, 360, 'currentColor', 0.10);
      }

      // Egyptian month labels (atrium only)
      if (isAtrium) {
        const months = MA.EGYPTIAN_MONTHS;
        const tg = el('g', { fill:'var(--ink-dim)' }, g);
        months.forEach((m, i) => {
          const angDeg = (i + 0.5) / 12 * 360;
          const a = deg2rad(angDeg - 90);
          const r = (ringMid + ringOuter) / 2;
          const x = cx + Math.cos(a)*r;
          const y = cy + Math.sin(a)*r;
          const rot = angDeg; // text follows the ring
          const tx = el('text', {
            x, y,
            'font-family':'Cinzel, serif',
            'font-size': R * 0.020,
            'text-anchor':'middle',
            'dominant-baseline':'middle',
            'letter-spacing':'0.08em',
            transform: `rotate(${rot} ${x} ${y})`
          }, tg);
          tx.textContent = m;
        });
      }

      // Saros mini-ticks (inner)
      if (isAtrium) {
        ticks(g, cx, cy, ringSaros - 10, ringSaros + 10, 223,
              'var(--hot)', 0.40, 0, null);
        ticks(g, cx, cy, ringSaros - 14, ringSaros + 14, 19,
              'var(--accent-3)', 0.7, 0, null);
      }

      // Decorative cross radii (atrium only) — small mechanical marks
      if (isAtrium) {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * 2 * Math.PI - Math.PI/2;
          const x1 = cx + Math.cos(a)*ringInner;
          const y1 = cy + Math.sin(a)*ringInner;
          const x2 = cx + Math.cos(a)*ringMid;
          const y2 = cy + Math.sin(a)*ringMid;
          el('line', { x1,y1,x2,y2, stroke:'var(--accent)',
            'stroke-width':0.7, 'stroke-opacity':0.20 }, g);
        }
      }

      // Outer rim decoration — small lugs every 30°
      const lugs = el('g', { fill:'currentColor', 'fill-opacity':0.6 }, g);
      for (let i = 0; i < 12; i++) {
        const a = deg2rad(i * 30 - 90);
        const x = cx + Math.cos(a)*ringOuter;
        const y = cy + Math.sin(a)*ringOuter;
        el('circle', { cx:x, cy:y, r: isAtrium ? 3 : 1.5,
          fill:'var(--accent)' }, lugs);
      }
      this._ringInner = ringInner;
      this._ringMid   = ringMid;
      this._ringSaros = ringSaros;
      this._hub       = hub;
    }

    _buildHands() {
      const cx = this.center, cy = this.center;
      const R = this.center*0.96;
      const isAtrium = this.mode === 'atrium';
      const hg = this.handsG;

      // Zodiac labels live on a rotating group (this is what users feel "moves" as time passes)
      this.zodiacG.innerHTML = '';
      const zg = el('g', { transform:`rotate(0 ${cx} ${cy})` }, this.zodiacG);
      this._zodiacRotor = zg;

      // Zodiac segments (background slices, very faint)
      const ringSeg = R * 0.79;
      const ringInner = R * 0.66;
      const ringMid = R * 0.86;
      MA.ZODIAC.forEach((z, i) => {
        const a0 = deg2rad(z.s - 90);
        const a1 = deg2rad(z.s + 30 - 90);
        const r1 = ringInner, r2 = ringMid;
        const x1 = cx + Math.cos(a0)*r1, y1 = cy + Math.sin(a0)*r1;
        const x2 = cx + Math.cos(a0)*r2, y2 = cy + Math.sin(a0)*r2;
        const x3 = cx + Math.cos(a1)*r2, y3 = cy + Math.sin(a1)*r2;
        const x4 = cx + Math.cos(a1)*r1, y4 = cy + Math.sin(a1)*r1;
        el('path', {
          d:`M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`,
          fill: i % 2 ? 'currentColor' : 'transparent',
          'fill-opacity': 0.04
        }, zg);
      });

      // Zodiac labels — Latin abbreviations in Cinzel (always renders).
      // In atrium mode we add the Unicode sign below as ornament, with Noto
      // Sans Symbols 2 preferred and a hard fallback to the full Latin name.
      MA.ZODIAC.forEach(z => {
        const a = deg2rad(z.s + 15 - 90);
        const r = (ringInner + ringMid) / 2;
        const x = cx + Math.cos(a)*r;
        const y = cy + Math.sin(a)*r;
        // Primary: ARI / TAU / GEM ...
        const ab = el('text', {
          x, y: isAtrium ? y - R*0.012 : y,
          fill:'var(--accent-2)',
          'font-family':"'Cinzel', serif",
          'font-size': R * (isAtrium ? 0.026 : 0.085),
          'text-anchor':'middle',
          'dominant-baseline':'middle',
          'letter-spacing':'0.16em',
          'font-weight':'700'
        }, zg);
        ab.textContent = z.a;
        if (isAtrium) {
          // Ornament glyph (renders with Noto Sans Symbols 2 if loaded)
          const gl = el('text', {
            x, y: y + R*0.020, fill:'var(--accent)',
            'font-family':"'Noto Sans Symbols 2', 'Segoe UI Symbol', 'Apple Symbols', serif",
            'font-size': R * 0.026,
            'text-anchor':'middle',
            'dominant-baseline':'middle',
            opacity:0.7
          }, zg);
          gl.textContent = z.g;
          // Full name micro-label
          const tn = el('text', {
            x, y: y + R*0.048, fill:'var(--ink-mute)',
            'font-family':"'Space Mono', monospace",
            'font-size': R * 0.010,
            'text-anchor':'middle',
            'letter-spacing':'0.22em'
          }, zg);
          tn.textContent = z.n.toUpperCase();
        }
      });

      /* ── Planet hands ── */
      // Only the visible-to-naked-eye planets the original tracked.
      // Each hand is a separate <g> rotated around the center.
      this._planetHands = {};
      const planets = isAtrium ? MA.PLANETS : MA.PLANETS.filter(p => p.id==='ter'); // corner: skip
      planets.forEach(p => {
        const handLen = R * (0.18 + p.ring * 0.07);
        const g = el('g', { transform: `rotate(0 ${cx} ${cy})` }, hg);
        // hand stem
        el('line', {
          x1: cx, y1: cy, x2: cx, y2: cy - handLen,
          stroke: p.color, 'stroke-width': 1.4,
          'stroke-opacity': 0.5
        }, g);
        // planet bead
        const bead = el('circle', {
          cx: cx, cy: cy - handLen, r: R * 0.013,
          fill: p.color, filter: 'url(#dial-glow)'
        }, g);
        // outer label (atrium)
        if (isAtrium) {
          const lab = el('text', {
            x: cx, y: cy - handLen - R*0.025,
            fill: p.color,
            'font-family':'Share Tech Mono, monospace',
            'font-size': R * 0.014,
            'text-anchor':'middle',
            'letter-spacing':'0.18em'
          }, g);
          lab.textContent = p.name.substr(0,3).toUpperCase();
        }
        this._planetHands[p.id] = { g, p };
      });

      /* ── Sun hand (gold) ── */
      const sunHand = el('g', { transform:`rotate(0 ${cx} ${cy})` }, hg);
      const sunLen = R * 0.62;
      el('line', { x1:cx, y1:cy, x2:cx, y2:cy - sunLen,
        stroke:'var(--accent)', 'stroke-width':2.4 }, sunHand);
      el('polygon', {
        points: `${cx},${cy - sunLen - 14} ${cx-7},${cy - sunLen + 2} ${cx+7},${cy - sunLen + 2}`,
        fill:'var(--accent)', filter:'url(#dial-glow)'
      }, sunHand);
      this._sunHand = sunHand;

      /* ── Moon hand (white, with phase) ── */
      const moonHand = el('g', { transform:`rotate(0 ${cx} ${cy})` }, hg);
      const moonLen = R * 0.50;
      el('line', { x1:cx, y1:cy, x2:cx, y2:cy - moonLen,
        stroke:'var(--ink)', 'stroke-width':1.6, 'stroke-opacity':0.85 }, moonHand);
      // Moon body (we'll paint phase via SVG fill clipping)
      this._moonBody = el('circle', {
        cx, cy: cy - moonLen, r: R * 0.022,
        fill:'var(--ink)', stroke:'var(--ink-dim)', 'stroke-width':0.8
      }, moonHand);
      // Moon shadow overlay
      this._moonShadow = el('ellipse', {
        cx, cy: cy - moonLen, rx: R * 0.022, ry: R * 0.022,
        fill:'var(--bg-deep)', opacity:0.85
      }, moonHand);
      this._moonHand = moonHand;
      this._moonRadius = R * 0.022;
      this._moonY = cy - moonLen;

      /* ── Central hub ornament ── */
      const hubR = R * 0.18;
      el('circle', { cx, cy, r:hubR,
        fill:'var(--bg-soft)', stroke:'var(--accent)', 'stroke-width':1.5 }, this.ornG);
      el('circle', { cx, cy, r:hubR*0.6,
        fill:'none', stroke:'var(--accent)', 'stroke-opacity':0.35, 'stroke-width':0.8 }, this.ornG);
      el('circle', { cx, cy, r:hubR*0.25,
        fill:'var(--accent)' }, this.ornG);

      // Central date readout
      if (isAtrium) {
        this._dateText = el('text', {
          x: cx, y: cy - R*0.005,
          fill:'var(--accent-2)',
          'font-family':'Cinzel, serif',
          'font-size': R * 0.026,
          'text-anchor':'middle',
          'letter-spacing':'0.30em'
        }, this.ornG);
        this._dateText.textContent = '';
        this._yearText = el('text', {
          x: cx, y: cy + R*0.035,
          fill:'var(--ink)',
          'font-family':'Cinzel, serif',
          'font-size': R * 0.055,
          'text-anchor':'middle',
          'letter-spacing':'0.20em'
        }, this.ornG);
        this._yearText.textContent = '—';
        this._eraText = el('text', {
          x: cx, y: cy + R*0.080,
          fill:'var(--ink-mute)',
          'font-family':'Space Mono, monospace',
          'font-size': R * 0.013,
          'text-anchor':'middle',
          'letter-spacing':'0.40em'
        }, this.ornG);
        this._eraText.textContent = '';
      }

      // Crank handle (atrium only)
      if (isAtrium) {
        const ck = el('g', { class:'dial-crank' }, this.ornG);
        // Crank position at 3 o'clock outside the dial
        const cR = R + R*0.04;
        el('line', { x1:cx+R*0.92, y1:cy, x2:cx+cR, y2:cy,
          stroke:'var(--warm)', 'stroke-width':3 }, ck);
        el('circle', { cx:cx+cR, cy:cy, r:R*0.024,
          fill:'var(--warm-lt)', stroke:'var(--warm-dk)', 'stroke-width':1 }, ck);
        el('text', { x:cx+cR, y:cy+R*0.06, fill:'var(--ink-mute)',
          'font-family':'Space Mono, monospace', 'font-size':R*0.013,
          'text-anchor':'middle', 'letter-spacing':'0.3em' }, ck).textContent = 'CRANK';
      }

      // Atrium mode: planet labels above outer ring saying which body each one is
      if (isAtrium) {
        // Saros label
        const ringSaros = this._ringSaros;
        const sl = el('text', { x:cx, y:cy - ringSaros - R*0.012,
          fill:'var(--hot)', 'font-family':'Space Mono, monospace',
          'font-size': R*0.012, 'text-anchor':'middle',
          'letter-spacing':'0.3em' }, this.staticG);
        sl.textContent = 'SAROS · 223';
        const ml = el('text', { x:cx, y:cy + ringSaros + R*0.022,
          fill:'var(--accent-3)', 'font-family':'Space Mono, monospace',
          'font-size': R*0.012, 'text-anchor':'middle',
          'letter-spacing':'0.3em' }, this.staticG);
        ml.textContent = 'METONIC · 19 YR';
      }
    }

    _buildInteraction() {
      const svg = this.svg;
      const cx = this.center, cy = this.center;
      const isAtrium = this.mode === 'atrium';

      const getAngle = (e) => {
        const r = svg.getBoundingClientRect();
        const sx = ((e.clientX || e.touches?.[0].clientX) - r.left) / r.width  * this.size;
        const sy = ((e.clientY || e.touches?.[0].clientY) - r.top)  / r.height * this.size;
        return Math.atan2(sy - cy, sx - cx);
      };

      const onDown = (e) => {
        e.preventDefault();
        this.dragging = true;
        this.lastAngle = getAngle(e);
        svg.style.cursor = 'grabbing';
      };
      const onMove = (e) => {
        if (!this.dragging) return;
        const a = getAngle(e);
        let delta = a - this.lastAngle;
        // wrap into [-PI, PI]
        if (delta > Math.PI)  delta -= 2*Math.PI;
        if (delta < -Math.PI) delta += 2*Math.PI;
        this.lastAngle = a;
        // Map angle delta to time delta. One full revolution = 1 year by default
        // but slower if user is dragging slowly. Use 1 rev = 1 year.
        const daysPerRad = 365.25 / (2*Math.PI);
        const newJd = this.jd + delta * daysPerRad;
        this.setDate(newJd);
        if (this.onDateChange) this.onDateChange(newJd, 'drag');
      };
      const onUp = () => {
        this.dragging = false;
        svg.style.cursor = isAtrium ? 'grab' : 'pointer';
      };

      svg.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      svg.addEventListener('touchstart', onDown, { passive:false });
      window.addEventListener('touchmove', onMove, { passive:false });
      window.addEventListener('touchend',  onUp);

      // Corner mode: click → onClick callback
      if (!isAtrium && this.onClick) {
        // handled below; we still want to detect a true click vs drag
        let dStart;
        svg.addEventListener('mousedown', e => { dStart = [e.clientX, e.clientY]; });
        svg.addEventListener('mouseup',   e => {
          if (!dStart) return;
          const moved = Math.hypot(e.clientX - dStart[0], e.clientY - dStart[1]);
          if (moved < 6) this.onClick && this.onClick();
        });
      }

      svg.style.cursor = isAtrium ? 'grab' : 'pointer';
    }

    /* ── Public API ── */
    setDate(jdt) {
      this.jd = jdt;
      const cx = this.center, cy = this.center;
      const R = this.center * 0.96;

      // Compute ecliptic longitudes
      const sunL  = MA.sunEclLon(jdt);          // 0..360 deg, ecliptic
      const moonL = MA.moonEclLon(jdt);
      const phase = MA.moonPhase(jdt);

      // Sun hand: 0° at Aries (top, by our zodiac layout we put Aries top at angle 0)
      // We use convention: angle = ecliptic longitude (Aries=0°, increasing CCW astronomically
      // but on a clock-like dial we rotate clockwise). We choose the dial layout so increasing
      // longitude == clockwise (matches the original Antikythera).
      this._sunHand.setAttribute('transform',  `rotate(${sunL}  ${cx} ${cy})`);
      this._moonHand.setAttribute('transform', `rotate(${moonL} ${cx} ${cy})`);

      // The Egyptian day-pointer is encoded by rotating the *zodiac ring* against the static
      // calendar — that's how the original works. We accomplish this by rotating the zodiac group
      // so that the current day on the Egyptian ring aligns with the Sun hand.
      // Year fraction → Egyptian day → rotation needed.
      const yf = MA.yearFraction(jdt);
      // Static calendar makes one full revolution per year; the zodiac is rotated by:
      // zodRot = sunL - (yf * 360)  → keeps Sun pointing at the same Egyptian day
      const zodRot = sunL - yf * 360;
      this._zodiacRotor.setAttribute('transform', `rotate(${zodRot} ${cx} ${cy})`);

      // Planet hands — geocentric ecliptic longitudes
      for (const id in this._planetHands) {
        if (id === 'ter') continue;
        const { g, p } = this._planetHands[id];
        const ecl = MA.geoVec(p, jdt);
        const lon = ((Math.atan2(ecl.y, ecl.x) * MA.r2d) + 360) % 360;
        g.setAttribute('transform', `rotate(${lon} ${cx} ${cy})`);
      }
      // Earth hand (atrium only — points at the Sun's antisolar position; just hide it)
      if (this._planetHands.ter) {
        this._planetHands.ter.g.setAttribute('opacity', 0); // skip
      }

      // Moon phase shadow
      if (this._moonShadow) {
        const r = this._moonRadius;
        // phase: 0=new (full shadow), 0.5=full (no shadow), 1=new again
        // Compute illuminated fraction
        const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
        // Shadow position: shift the dark ellipse left or right
        const shift = (phase < 0.5 ? -1 : 1) * (1 - illum) * r * 0.9;
        const rx = r * (1 - illum*1.8);
        this._moonShadow.setAttribute('cx', cx + shift);
        this._moonShadow.setAttribute('rx', Math.max(0.1, Math.abs(rx)));
      }

      // Date text
      if (this._dateText) {
        const d = MA.dj(jdt);
        const yr = d.getUTCFullYear();
        const mo = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()];
        const dy = String(d.getUTCDate()).padStart(2,'0');
        this._dateText.textContent = `${dy} ${mo}`;
        this._yearText.textContent = String(Math.abs(yr < 1 ? yr - 1 : yr));
        this._eraText.textContent = yr < 1 ? 'BCE' : (yr < 1500 ? 'CE' : 'COMMON ERA');
      }
    }
  }

  MA.AntikytheraDial = AntikytheraDial;

})(window.MA);
