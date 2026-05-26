/* ─────────────────────────────────────────────────────────────
   MANIFOLD ATLAS — Earth renderer

   Orthographic projection. Uses d3-geo + topojson-client for the
   coastlines (world-atlas land-110m). Article nodes are pinned by
   lat/lon and glow when their date is within the active window.

   Designed to look at home in every theme — colors read from CSS
   custom properties live on each frame.
   ───────────────────────────────────────────────────────────── */
window.MA = window.MA || {};

(function(MA){
  'use strict';

  const COASTLINE_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';

  class EarthGlobe {
    constructor(canvas, getTheme) {
      this.cv  = canvas;
      this.ctx = canvas.getContext('2d');
      this.getTheme = getTheme;  // function returning theme name
      this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.W = 0; this.H = 0;
      this.rotation = [12, -10, 0]; // [lambda, phi, gamma]
      this.scale = 0;               // computed in resize
      this.spin = true;
      this.spinRate = 0.005;        // deg/frame — gentle
      this.land = null;             // GeoJSON MultiPolygon
      this.nodes = [];              // article nodes
      this.jd = MA.jd(new Date());
      this.activeNode = null;
      this.hoverNode  = null;
      this.onNodeClick = null;
      this.onNodeHover = null;
      this.dragging = false;
      this.dragLast = null;
      this._loadLand();
      this._bind();
      this.resize();
    }

    async _loadLand() {
      try {
        const t = await fetch(COASTLINE_URL).then(r => r.json());
        // topojson world-atlas land-110m exposes objects.land
        this.land = window.topojson.feature(t, t.objects.land);
      } catch (e) {
        console.warn('Earth: failed to load land', e);
        this.land = null;
      }
    }

    setNodes(nodes) { this.nodes = nodes || []; }
    setDate(jdt)    { this.jd = jdt; }
    setSpin(on)     { this.spin = !!on; }
    setActive(node) { this.activeNode = node; }

    resize() {
      const rect = this.cv.getBoundingClientRect();
      this.W = rect.width;  this.H = rect.height;
      this.cv.width  = this.W * this.dpr;
      this.cv.height = this.H * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // Globe scale: 40% of the shorter dimension
      this.scale = Math.min(this.W, this.H) * 0.38;
      // Re-init projection
      this._buildProjection();
    }

    _buildProjection() {
      this.proj = d3.geoOrthographic()
        .translate([this.W/2, this.H/2])
        .scale(this.scale)
        .clipAngle(90)
        .rotate(this.rotation);
      this.path = d3.geoPath(this.proj, this.ctx);
    }

    _bind() {
      const c = this.cv;
      const moveHandler = (cx, cy) => {
        if (!this.dragging || !this.dragLast) return;
        const dx = cx - this.dragLast[0];
        const dy = cy - this.dragLast[1];
        this.rotation[0] = (this.rotation[0] + dx * 0.4);
        this.rotation[1] = Math.max(-85, Math.min(85, this.rotation[1] - dy * 0.4));
        this.dragLast = [cx, cy];
        this.spin = false;
      };
      c.addEventListener('mousedown', e => {
        this.dragging = true;
        this.dragLast = [e.clientX, e.clientY];
        this.dragStart = [e.clientX, e.clientY];
        c.classList.add('dragging');
      });
      window.addEventListener('mousemove', e => {
        moveHandler(e.clientX, e.clientY);
        if (!this.dragging) this._hoverTest(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', e => {
        if (this.dragging) {
          const moved = Math.hypot(
            e.clientX - this.dragStart[0],
            e.clientY - this.dragStart[1]
          );
          if (moved < 6) this._clickTest(e.clientX, e.clientY);
        }
        this.dragging = false; this.dragLast = null;
        c.classList.remove('dragging');
      });
      // Touch
      c.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          this.dragging = true;
          const t = e.touches[0];
          this.dragLast  = [t.clientX, t.clientY];
          this.dragStart = [t.clientX, t.clientY];
        }
      }, { passive:true });
      c.addEventListener('touchmove', e => {
        if (this.dragging && e.touches.length === 1) {
          e.preventDefault();
          const t = e.touches[0];
          moveHandler(t.clientX, t.clientY);
        }
      }, { passive:false });
      c.addEventListener('touchend', e => {
        if (this.dragging && this.dragStart && e.changedTouches.length) {
          const t = e.changedTouches[0];
          const moved = Math.hypot(
            t.clientX - this.dragStart[0],
            t.clientY - this.dragStart[1]
          );
          if (moved < 8) this._clickTest(t.clientX, t.clientY);
        }
        this.dragging = false; this.dragLast = null;
      });
    }

    _projectNode(n) {
      // returns {x,y,visible}
      const p = this.proj([n.location.lon, n.location.lat]);
      if (!p) return null;
      // Visibility: distance from rotation center
      const center = this.proj.rotate();
      const lambda = -center[0] * MA.d2r, phi = -center[1] * MA.d2r;
      const lon = n.location.lon * MA.d2r, lat = n.location.lat * MA.d2r;
      const cosC = Math.sin(phi)*Math.sin(lat) +
                   Math.cos(phi)*Math.cos(lat)*Math.cos(lon - lambda);
      return { x:p[0], y:p[1], visible: cosC > -0.05, depth: cosC };
    }

    _hoverTest(cx, cy) {
      const r = this.cv.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      let best = null, bestD = Infinity;
      for (const n of this.nodes) {
        const p = this._projectNode(n);
        if (!p || !p.visible) continue;
        const d = Math.hypot(px - p.x, py - p.y);
        if (d < 14 && d < bestD) { best = n; bestD = d; }
      }
      if (best !== this.hoverNode) {
        this.hoverNode = best;
        if (this.onNodeHover) this.onNodeHover(best, cx, cy);
      } else if (best && this.onNodeHover) {
        this.onNodeHover(best, cx, cy);
      }
    }

    _clickTest(cx, cy) {
      const r = this.cv.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      let best = null, bestD = Infinity;
      for (const n of this.nodes) {
        const p = this._projectNode(n);
        if (!p || !p.visible) continue;
        const d = Math.hypot(px - p.x, py - p.y);
        if (d < 18 && d < bestD) { best = n; bestD = d; }
      }
      if (best && this.onNodeClick) this.onNodeClick(best);
    }

    // Smoothly rotate to a lat/lon
    flyTo(lat, lon, dur = 1100) {
      const start = [...this.rotation];
      const target = [-lon, -lat, 0];
      // Normalize target so we take the short way
      let d0 = target[0] - start[0];
      while (d0 > 180)  d0 -= 360;
      while (d0 < -180) d0 += 360;
      const t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        const ease = u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u+2, 2)/2;
        this.rotation[0] = start[0] + d0 * ease;
        this.rotation[1] = start[1] + (target[1] - start[1]) * ease;
        this.spin = false;
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    // Read theme tokens off the document at render-time so they live-swap
    _themeColors() {
      const s = getComputedStyle(document.documentElement);
      const get = (v, fallback) => (s.getPropertyValue(v).trim() || fallback);
      return {
        bg:    get('--earth-bg',   '#0a0805'),
        land:  get('--earth-land', '#2b3a26'),
        line:  get('--earth-line', '#a67041'),
        grid:  get('--earth-grid', 'rgba(166,112,65,0.10)'),
        node:  get('--node-color', '#d4a373'),
        glow:  get('--node-glow',  '#f0c38e'),
        ink:   get('--ink',        '#d4c39a'),
        dim:   get('--ink-dim',    '#7a6a4e'),
        accent:get('--accent',     '#c9a84c')
      };
    }

    render() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const theme = this._themeColors();
      const cx = W/2, cy = H/2, R = this.scale;

      // Auto spin
      if (this.spin) {
        this.rotation[0] = (this.rotation[0] + this.spinRate);
      }
      this.proj.rotate(this.rotation);

      // Background gradient
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Outer atmospheric halo
      const halo = ctx.createRadialGradient(cx, cy, R*0.95, cx, cy, R*1.20);
      halo.addColorStop(0, theme.accent + '22');
      halo.addColorStop(0.7, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R*1.22, 0, Math.PI*2);
      ctx.fill();

      // Sphere disk (land fill if theme paints it)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.clip();
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0,0,W,H);

      // Subtle sphere shading
      const sphere = ctx.createRadialGradient(
        cx - R*0.3, cy - R*0.4, R*0.05,
        cx, cy, R*1.05
      );
      sphere.addColorStop(0, theme.accent + '14');
      sphere.addColorStop(0.6, 'rgba(0,0,0,0)');
      sphere.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = sphere;
      ctx.fillRect(0,0,W,H);
      ctx.restore();

      // Graticule
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.clip();
      const grat = d3.geoGraticule().step([15, 15]);
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      this.path(grat());
      ctx.stroke();
      ctx.restore();

      // Land
      if (this.land) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI*2);
        ctx.clip();

        // Fill (skip transparent themes)
        if (theme.land !== 'transparent') {
          ctx.fillStyle = theme.land;
          ctx.beginPath();
          this.path(this.land);
          ctx.fill();
        }
        // Stroke (coastline)
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        this.path(this.land);
        ctx.stroke();

        // Lift: faint inner highlight (gives a "leafed" feel)
        ctx.strokeStyle = theme.accent;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        this.path(this.land);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Sphere outline
      ctx.strokeStyle = theme.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.stroke();

      // Article nodes
      this._renderNodes(theme);

      // Loading hint
      if (!this.land) {
        ctx.fillStyle = theme.dim;
        ctx.font = '10px Space Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('· LOADING COASTLINES ·', cx, cy + R + 30);
        ctx.textAlign = 'left';
      }

      // Compass label
      ctx.fillStyle = theme.dim;
      ctx.font = "8px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`λ ${(-this.rotation[0]).toFixed(1)}°  φ ${(-this.rotation[1]).toFixed(1)}°`,
                   cx, cy + R + 18);
      ctx.textAlign = 'left';
    }

    _renderNodes(theme) {
      const ctx = this.ctx;
      const activeJd = this.jd;
      // Sort by depth so far-side nodes draw first (won't actually show due to clip, but ordering is nice)
      const projected = this.nodes
        .map(n => ({ n, p: this._projectNode(n) }))
        .filter(np => np.p && np.p.visible)
        .sort((a,b) => a.p.depth - b.p.depth);

      const tween = performance.now() * 0.0015;

      projected.forEach(({n, p}) => {
        const isActive = this.activeNode && this.activeNode.id === n.id;
        const isHover  = this.hoverNode && this.hoverNode.id === n.id;
        const nodeJd = MA.ymdToJd(n.date.year, n.date.month, n.date.day);
        const yrsAway = Math.abs(nodeJd - activeJd) / 365.25;
        // Node is "alive" when the dial is near its date
        const proximity = Math.max(0, 1 - yrsAway / 20);

        const baseR = 3 + (n.nodeSize || 0.5) * 4;
        const pulse = 1 + 0.18 * Math.sin(tween + n.location.lat * 0.1);
        const r = baseR * (isActive ? 1.7 : isHover ? 1.35 : 1) * pulse;
        const color = n.nodeColor || theme.node;

        // Glow if active or near in time
        const glowStr = isActive ? 1
                      : isHover  ? 0.7
                      : 0.25 + proximity * 0.65;
        ctx.shadowBlur  = 14 * glowStr * p.depth;
        ctx.shadowColor = color;

        // Faint disc
        ctx.fillStyle = color;
        ctx.globalAlpha = (0.55 + 0.45 * p.depth) * (0.4 + 0.6 * Math.max(proximity, isHover ? 1 : 0.3));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Inner kernel
        ctx.fillStyle = theme.glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI*2);
        ctx.fill();

        // Ring on active
        if (isActive) {
          const ringR = r + 6 + 3 * Math.sin(tween*2);
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ringR, 0, Math.PI*2);
          ctx.stroke();
        }
      });

      // Connections — draw light geodesic-ish line between active node and its connections
      if (this.activeNode && this.activeNode.connections) {
        const start = this._projectNode(this.activeNode);
        if (start && start.visible) {
          this.activeNode.connections.forEach(cid => {
            const other = this.nodes.find(x => x.id === cid);
            if (!other) return;
            const end = this._projectNode(other);
            if (!end || !end.visible) return;
            ctx.save();
            ctx.strokeStyle = theme.accent;
            ctx.globalAlpha = 0.35;
            ctx.setLineDash([3, 5]);
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            // Curved line (quadratic) — bow it slightly outward
            const mx = (start.x + end.x) / 2;
            const my = (start.y + end.y) / 2;
            const dx = end.x - start.x, dy = end.y - start.y;
            const px = -dy * 0.18, py = dx * 0.18;
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(mx + px, my + py, end.x, end.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          });
        }
      }
    }
  }

  MA.EarthGlobe = EarthGlobe;

})(window.MA);
