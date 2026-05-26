/* ─────────────────────────────────────────────────────────────
   MANIFOLD ATLAS — Sky renderer

   Full-bleed stereographic projection of the night sky from a
   chosen observer (lat/lon) at a chosen date. Pulls the d3-celestial
   star + constellation catalogs.

   No tiny circle — the dome fills the viewport. The "1652 traveler
   in the desert, no light pollution" view.
   ───────────────────────────────────────────────────────────── */
window.MA = window.MA || {};

(function(MA){
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data/';

  class SkyDome {
    constructor(canvas, getTheme) {
      this.cv  = canvas;
      this.ctx = canvas.getContext('2d');
      this.getTheme = getTheme;
      this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.W = 0; this.H = 0;
      this.jd = MA.jd(new Date());
      this.observerLat = 31.7683;  // Jerusalem default
      this.observerLon = 35.2137;
      this.observerName = 'JERUSALEM';
      this.raOff = 0;  this.decOff = 0;   // user drag offsets
      this.zoom = 1.0;
      this.data = null;
      this.loading = false;
      this.dragging = false; this.dragLast = null;
      this._bind();
      this.resize();
      this.load();
    }

    async load() {
      if (this.data || this.loading) return;
      this.loading = true;
      try {
        const [sr, cr] = await Promise.all([
          fetch(CDN + 'stars.6.json'),
          fetch(CDN + 'constellations.lines.json')
        ]);
        const [stars, cons] = await Promise.all([sr.json(), cr.json()]);
        this.data = {
          stars: stars.features,
          cons:  cons.features
        };
      } catch (e) {
        console.warn('Sky: failed to load celestial data', e);
      }
      this.loading = false;
    }

    setObserver(lat, lon, name) {
      this.observerLat = lat;
      this.observerLon = lon;
      this.observerName = name || `${lat.toFixed(1)}°N`;
      this.raOff = 0; this.decOff = 0;
    }
    setDate(jdt) { this.jd = jdt; }

    resize() {
      const rect = this.cv.getBoundingClientRect();
      this.W = rect.width; this.H = rect.height;
      this.cv.width  = this.W * this.dpr;
      this.cv.height = this.H * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // Scale chosen so a full hemisphere covers the larger viewport dim
      this.baseScale = Math.max(this.W, this.H) * 0.50;
    }

    _bind() {
      const c = this.cv;
      c.addEventListener('mousedown', e => {
        this.dragging = true;
        this.dragLast = [e.clientX, e.clientY];
        c.classList.add('dragging');
      });
      window.addEventListener('mousemove', e => {
        if (!this.dragging || !this.dragLast) return;
        const dx = e.clientX - this.dragLast[0];
        const dy = e.clientY - this.dragLast[1];
        this.dragLast = [e.clientX, e.clientY];
        const dec0 = this.observerLat + this.decOff;
        this.raOff  -= (dx / (this.baseScale * Math.max(0.15, Math.cos(dec0 * MA.d2r)))) * MA.r2d;
        this.decOff = Math.max(-90 - this.observerLat, Math.min(90 - this.observerLat,
                      this.decOff + (dy / this.baseScale) * MA.r2d));
      });
      window.addEventListener('mouseup', () => {
        this.dragging = false; this.dragLast = null;
        c.classList.remove('dragging');
      });
      c.addEventListener('wheel', e => {
        e.preventDefault();
        this.zoom *= (e.deltaY < 0 ? 1.12 : 0.9);
        this.zoom = Math.max(0.45, Math.min(4, this.zoom));
      }, { passive:false });
      // Touch
      c.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          this.dragging = true;
          const t = e.touches[0];
          this.dragLast = [t.clientX, t.clientY];
        }
      }, { passive:true });
      c.addEventListener('touchmove', e => {
        if (!this.dragging || e.touches.length !== 1) return;
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - this.dragLast[0];
        const dy = t.clientY - this.dragLast[1];
        this.dragLast = [t.clientX, t.clientY];
        const dec0 = this.observerLat + this.decOff;
        this.raOff  -= (dx / (this.baseScale * Math.max(0.15, Math.cos(dec0 * MA.d2r)))) * MA.r2d;
        this.decOff = Math.max(-90 - this.observerLat, Math.min(90 - this.observerLat,
                      this.decOff + (dy / this.baseScale) * MA.r2d));
      }, { passive:false });
      c.addEventListener('touchend', () => { this.dragging = false; });
    }

    _proj(ra, dec, ra0, dec0, sc, cx, cy) {
      // Stereographic — same as the existing files
      if (ra < 0) ra += 360;
      let dRa = (ra - ra0) * MA.d2r;
      while (dRa >  Math.PI) dRa -= 2 * Math.PI;
      while (dRa < -Math.PI) dRa += 2 * Math.PI;
      const D = dec * MA.d2r, D0 = dec0 * MA.d2r;
      const sinD = Math.sin(D), cosD = Math.cos(D);
      const sinD0 = Math.sin(D0), cosD0 = Math.cos(D0);
      const cosC = sinD0*sinD + cosD0*cosD*Math.cos(dRa);
      if (cosC < -0.05) return null;       // behind plane
      const k = 2 / (1 + cosC);
      return {
        x: cx + k * cosD * Math.sin(dRa) * sc,
        y: cy - k * (cosD0*sinD - sinD0*cosD*Math.cos(dRa)) * sc,
        depth: cosC
      };
    }

    _starColor(bv, theme) {
      if (bv == null) return theme.star;
      if (bv < -0.3) return '#c0ccff';
      if (bv <  0.0) return '#d0dcff';
      if (bv <  0.3) return '#ffffff';
      if (bv <  0.6) return '#ffffd0';
      if (bv <  1.0) return '#ffd090';
      return '#ff9060';
    }

    _starR(mag) {
      // brighter stars are bigger
      return Math.max(0.5, Math.min(5.5, 4.2 - mag * 0.62));
    }

    _themeColors() {
      const s = getComputedStyle(document.documentElement);
      const get = (v, fb) => (s.getPropertyValue(v).trim() || fb);
      return {
        bg:    get('--earth-bg', '#000'),
        star:  get('--star', '#fff'),
        cons:  get('--constellation', 'rgba(255,255,255,0.3)'),
        milky: get('--milky', 'rgba(255,255,255,0.05)'),
        ink:   get('--ink', '#fff'),
        dim:   get('--ink-dim', '#888'),
        mute:  get('--ink-mute', '#444'),
        accent:get('--accent', '#fff'),
        accent3:get('--accent-3', '#fff'),
        hot:   get('--hot', '#c00')
      };
    }

    render() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const theme = this._themeColors();
      const cx = W/2, cy = H/2;
      const sc = this.baseScale * this.zoom;

      // Background — deep night with a faint horizon glow at the bottom
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0,    '#000005');
      grad.addColorStop(0.55, '#020310');
      grad.addColorStop(1,    '#040818');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Compute observer-centered RA/Dec
      const lst = MA.calcLST(this.jd, this.observerLon);
      const ra0 = (lst + this.raOff + 360) % 360;
      const dec0 = Math.max(-89, Math.min(89, this.observerLat + this.decOff));

      const proj = (ra, dec) => this._proj(ra, dec, ra0, dec0, sc, cx, cy);

      // Faint horizon ring (90° from zenith)
      ctx.save();
      const horizonR = sc * 2; // stereographic horizon distance: r=2 at C=0
      ctx.strokeStyle = theme.dim;
      ctx.globalAlpha = 0.20;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonR, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();

      // Cardinal labels at horizon
      const cardinals = [
        { label:'N', raOff:180 }, { label:'S', raOff:0 },
        { label:'E', raOff:90  }, { label:'W', raOff:270 }
      ];
      cardinals.forEach(c => {
        const pt = proj((ra0 + c.raOff) % 360, -89);
        if (!pt) return;
        const a = Math.atan2(pt.y - cy, pt.x - cx);
        const r = Math.min(horizonR, Math.min(W, H) * 0.48) - 18;
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = 0.55;
        ctx.font = "bold 11px 'Cinzel', serif";
        ctx.textAlign = 'center';
        ctx.fillText(c.label, cx + Math.cos(a)*r, cy + Math.sin(a)*r + 4);
        ctx.globalAlpha = 1;
      });

      if (!this.data) {
        ctx.fillStyle = theme.dim;
        ctx.font = "10px 'Space Mono', monospace";
        ctx.textAlign = 'center';
        ctx.fillText(this.loading ? '· LOADING STAR CATALOG ·' : '· TAP TO LOAD ·',
                     cx, cy);
        ctx.textAlign = 'left';
        return;
      }

      // Constellation lines
      ctx.save();
      ctx.strokeStyle = theme.cons;
      ctx.lineWidth = 0.8;
      this.data.cons.forEach(feat => {
        if (!feat.geometry || feat.geometry.type !== 'MultiLineString') return;
        feat.geometry.coordinates.forEach(line => {
          ctx.beginPath();
          let started = false;
          line.forEach(c => {
            const pt = proj(c[0], c[1]);
            if (pt) {
              started ? ctx.lineTo(pt.x, pt.y) : (ctx.moveTo(pt.x, pt.y), started = true);
            }
          });
          if (started) ctx.stroke();
        });
      });
      ctx.restore();

      // Constellation names
      ctx.save();
      ctx.fillStyle = theme.cons;
      ctx.font = "9px 'Cinzel', serif";
      ctx.textAlign = 'center';
      this.data.cons.forEach(feat => {
        if (!feat.geometry || !feat.properties) return;
        const coords = feat.geometry.coordinates;
        if (!coords || !coords[0] || coords[0].length < 2) return;
        const mid = coords[0][Math.floor(coords[0].length/2)];
        const pt = proj(mid[0], mid[1]);
        if (!pt) return;
        // Don't crowd at the edges
        const dist = Math.hypot(pt.x - cx, pt.y - cy);
        if (dist > horizonR) return;
        const name = (feat.properties.name || '').toUpperCase();
        ctx.fillText(name.substring(0, 8), pt.x, pt.y);
      });
      ctx.restore();

      // Stars
      ctx.save();
      this.data.stars.forEach(feat => {
        const [ra, dec] = feat.geometry.coordinates;
        const mag = feat.properties.mag;
        if (mag > 5.6) return;
        const pt = proj(ra, dec);
        if (!pt) return;
        const r = this._starR(mag);
        const col = this._starColor(feat.properties.bv, theme);
        if (mag < 2.4) {
          ctx.shadowBlur  = r * 6;
          ctx.shadowColor = col;
        }
        ctx.fillStyle = col;
        ctx.globalAlpha = Math.min(1, 0.35 + (3.0 - mag) * 0.22);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Cross diffraction spikes on the brightest stars
        if (mag < 1.2) {
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.30;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(pt.x - r*4, pt.y); ctx.lineTo(pt.x + r*4, pt.y);
          ctx.moveTo(pt.x, pt.y - r*4); ctx.lineTo(pt.x, pt.y + r*4);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Proper name for ★ bright stars
        if (feat.properties.name && mag < 1.8) {
          ctx.fillStyle = theme.accent;
          ctx.globalAlpha = 0.65;
          ctx.font = "8px 'Space Mono', monospace";
          ctx.fillText(feat.properties.name, pt.x + r + 4, pt.y + 3);
          ctx.globalAlpha = 1;
        }
      });
      ctx.restore();

      // Sun + Moon + visible planets
      const T = MA.julianCenturies(this.jd);
      const earthEcl = MA.planetPos(MA.PLANETS[2], this.jd);

      // Sun
      const sunGeo = { x:-earthEcl.x, y:-earthEcl.y, z:-earthEcl.z };
      const sunEq = MA.ecl2eq(sunGeo, this.jd);
      const sp = proj(sunEq.ra, sunEq.dec);
      if (sp) {
        const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 26);
        g.addColorStop(0, 'rgba(255,240,170,.95)');
        g.addColorStop(0.4, 'rgba(255,150,30,.45)');
        g.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 26, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 22; ctx.shadowColor = '#ffd040';
        ctx.fillStyle = '#fff8d0';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 5.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffd070';
        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillText('SUN', sp.x + 10, sp.y + 4);
      }

      // Moon
      const moonLon = MA.moonEclLon(this.jd);
      const moonLonR = moonLon * MA.d2r;
      const moonEcl = { x: Math.cos(moonLonR)*0.0026, y: Math.sin(moonLonR)*0.0026, z: 0 };
      const moonEq = MA.ecl2eq(moonEcl, this.jd);
      const mp = proj(moonEq.ra, moonEq.dec);
      if (mp) {
        const phase = MA.moonPhase(this.jd);
        const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
        const r = 9;
        ctx.fillStyle = '#e8e8d8';
        ctx.beginPath(); ctx.arc(mp.x, mp.y, r, 0, Math.PI*2); ctx.fill();
        const shift = (phase < 0.5 ? -1 : 1) * (1 - illum) * r * 0.95;
        ctx.fillStyle = '#020310';
        ctx.beginPath();
        ctx.ellipse(mp.x + shift, mp.y, Math.max(0.5, r * (1 - illum*1.8)), r, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#c0c0a0';
        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillText('MOON', mp.x + r + 3, mp.y + 4);
      }

      // Planets
      MA.PLANETS.forEach(p => {
        if (p.id === 'ter') return;
        const v = MA.geoVec(p, this.jd);
        const eq = MA.ecl2eq(v, this.jd);
        const pt = proj(eq.ra, eq.dec);
        if (!pt) return;
        const r = 3;
        ctx.shadowBlur = 12; ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.font = "8px 'Space Mono', monospace";
        ctx.fillText(p.name.substring(0, 3).toUpperCase(), pt.x + r + 3, pt.y + 3);
        ctx.globalAlpha = 1;
      });

      // Zenith crosshair (where we're looking)
      ctx.save();
      ctx.strokeStyle = theme.accent3;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI*2);
      ctx.moveTo(cx - 22, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4,  cy); ctx.lineTo(cx + 22, cy);
      ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);  ctx.lineTo(cx, cy + 22);
      ctx.stroke();
      ctx.restore();

      // Footer info — observer/date strip
      ctx.fillStyle = theme.mute;
      ctx.font = "9px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      const lstH = Math.floor(lst / 15);
      const lstM = Math.floor((lst / 15 - lstH) * 60);
      ctx.fillText(
        `OBSERVER · ${this.observerName}   ·   LAT ${this.observerLat.toFixed(2)}°   ·   LST ${String(lstH).padStart(2,'0')}h${String(lstM).padStart(2,'0')}m`,
        cx, H - 18
      );
      ctx.textAlign = 'left';
    }
  }

  MA.SkyDome = SkyDome;

})(window.MA);
