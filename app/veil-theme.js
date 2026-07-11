/* ─────────────────────────────────────────────────────────────
   FEISTTECH — "Veil of Babel" theme.
   The page itself reads in near-darkness. Each lit candle burns a
   soft circular window into that darkness, giving light to whatever
   text sits under it; an extinguished one gives none, so the reader
   has to carry the shamash back to it to see that part of the page
   again. Eight candles, plus the shamash — a Hanukkiah, not an
   arbitrary count.

   Mounts itself only while data-theme="veil" is active, listening
   for FeistTheme's change event; tears itself down completely
   otherwise so it costs nothing on every other theme.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var ACTIVE_THEME = 'veil';
  var mounted = false;
  var raf = null;
  var width, height;

  var dnaCanvas, dnaCtx, maskCanvas, maskCtx, candleCanvas, candleCtx, carrierHandle;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    [dnaCanvas, maskCanvas, candleCanvas].forEach(function (c) {
      if (c) { c.width = width; c.height = height; }
    });
    placeCarrier();
  }

  function scrollPercent() {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    return docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
  }

  /* ================= DNA HELIX — ambient, scroll-driven ================= */
  var dnaTime = 0, dnaSeparation = 0;
  var DNA_COLORS = { A: '#c5a059', B: '#8a1c1c', link1: '#4aa8a8', link2: '#8859c5' };

  function drawDNA() {
    dnaCtx.fillStyle = 'rgba(5,5,5,0.2)';
    dnaCtx.fillRect(0, 0, width, height);
    var targetSeparation = 30 + scrollPercent() * 160;
    dnaSeparation += (targetSeparation - dnaSeparation) * 0.04;
    var cx = width / 2;
    for (var i = -50; i < 150; i++) {
      var y = (height / 2) + (i * 22) - 400 + Math.sin(dnaTime * 0.05) * 60;
      var pA = Math.sin(dnaTime + i * 0.15);
      var pB = Math.sin(dnaTime + i * 0.15 + Math.PI);
      var xA = cx + (pA * 100) - (dnaSeparation * 0.5);
      var xB = cx + (pB * 100) + (dnaSeparation * 0.5);
      dnaCtx.beginPath(); dnaCtx.fillStyle = DNA_COLORS.A; dnaCtx.arc(xA, y, 3, 0, Math.PI * 2); dnaCtx.fill();
      dnaCtx.beginPath(); dnaCtx.fillStyle = DNA_COLORS.B; dnaCtx.arc(xB, y, 3, 0, Math.PI * 2); dnaCtx.fill();
      dnaCtx.strokeStyle = (i % 2) ? DNA_COLORS.link1 : DNA_COLORS.link2;
      dnaCtx.lineWidth = 1;
      if (dnaSeparation < 20) {
        dnaCtx.beginPath(); dnaCtx.moveTo(xA, y); dnaCtx.lineTo(xB, y); dnaCtx.stroke();
      } else {
        dnaCtx.beginPath(); dnaCtx.moveTo(xA, y); dnaCtx.lineTo(xA + (pA > 0 ? -20 : 20), y); dnaCtx.stroke();
        dnaCtx.beginPath(); dnaCtx.moveTo(xB, y); dnaCtx.lineTo(xB + (pB > 0 ? -20 : 20), y); dnaCtx.stroke();
      }
    }
    dnaTime += 0.015;
  }

  /* ================= CANDLES ================= */
  var CANDLE_COUNT = 8;          // + the shamash = a Hanukkiah's 9
  var LIGHT_RADIUS = 230;        // how far a lit candle's window into the dark reaches
  var RELIGHT_RADIUS = 60;       // how close the shamash has to physically get to relight
  var candles = [];

  function makeCandle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height + 100,
      z: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      state: 'lit',              // 'lit' | 'extinguished'
      life: 1,
      dieAt: 0.15 + Math.random() * 0.75,   // scroll fraction where it starts guttering
      smoke: []
    };
  }

  function resetCandles() {
    candles = [];
    for (var i = 0; i < CANDLE_COUNT; i++) candles.push(makeCandle());
  }

  // The one always-lit candle the visitor can grab and carry.
  var carrier = {
    x: 0, y: 0, homeX: 0, homeY: 0, dragging: false, tilt: 0, tiltTarget: 0,
    grabDX: 0, grabDY: 0, mode: 'idle', targetCandle: null,
    flightFrom: null, flightTo: null, flightStart: 0
  };
  var candleHandles = [];

  function placeCarrier() {
    carrier.homeX = width - 70;
    carrier.homeY = height - 110;
    if (!carrier.dragging && carrier.mode === 'idle') {
      carrier.x = carrier.homeX;
      carrier.y = carrier.homeY;
    }
  }

  function updateCandle(c) {
    if (c.state === 'lit') {
      if (scrollPercent() > c.dieAt) {
        c.life -= 0.006;
        if (c.life <= 0) { c.life = 0; c.state = 'extinguished'; }
      }
      // Extinguished candles freeze exactly where they are — only lit
      // ones drift, which is what makes a dark one read as "stopped."
      c.y -= 0.5 * c.z;
      c.x += Math.sin(dnaTime * 0.6 + c.phase) * c.z * 0.3;
      if (c.y < -100) { c.y = height + 100; c.x = Math.random() * width; }
    } else if (Math.random() < 0.06) {
      c.smoke.push({ x: c.x, y: c.y - 20, age: 0, drift: (Math.random() - 0.5) * 0.6 });
    }
    c.smoke.forEach(function (p) { p.age += 1; p.y -= 0.6; p.x += p.drift; });
    c.smoke = c.smoke.filter(function (p) { return p.age < 90; });
  }

  // Flame is deliberately subtle -- it's a light SOURCE, not the thing
  // meant to hold your eye. The text it reveals is. The wax outline is
  // the opposite: it has to stay clearly visible even when the candle
  // is small/distant and even after it's gone out, or there's no way to
  // tell where to bring the shamash.
  function drawCandleBody(ctx, x, y, z, flameStrength, tilt) {
    var scale = z * 0.6;
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0.4, 0.14 * z) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(-6, 0, 12, 60);
    if (flameStrength > 0) {
      var flicker = (Math.random() * 0.15 + 0.55) * flameStrength;
      ctx.shadowBlur = 14 * flicker;
      ctx.shadowColor = '#ffaa00';
      ctx.fillStyle = 'rgba(255,170,0,' + flicker + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-10, -15, 0, -40 * flameStrength);
      ctx.quadraticCurveTo(10, -15, 0, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSmoke(ctx, c) {
    c.smoke.forEach(function (p) {
      var a = Math.max(0, 1 - p.age / 90) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.arc(p.x, p.y, 3 + p.age * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Burns a soft round window into the darkness mask at (x,y) -- this is
  // what actually makes the page readable under a lit candle.
  function punchLight(ctx, x, y, radius) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.8, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ambient brightness is a function of how many candles are actually
  // lit, not a fixed dark backdrop: all 8 lit should read as "the whole
  // thing is lit" (barely any veil left at all), and all 8 out should
  // read as moonlight -- dim, but still navigable, never near-black.
  // Warm additive glow layered on top of a punched hole -- erasing the
  // dark mask only reveals the page's true (often very dark) colors, it
  // doesn't brighten them, so without this a "lit" spot can paradoxically
  // read darker than the moonlit ambient around it wherever the actual
  // page content is dim.
  function glow(ctx, x, y, radius) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, 'rgba(255,205,130,0.20)');
    g.addColorStop(1, 'rgba(255,205,130,0)');
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMask() {
    const litCount = candles.filter(function (c) { return c.state === 'lit'; }).length;
    const litFrac = litCount / candles.length;
    const ambientAlpha = 0.26 - litFrac * 0.22; // 0 lit -> 0.26 (moonlit), 8 lit -> 0.04

    // A cool blue-grey rather than near-black -- an overlay this color
    // reads as moonlight even at low alpha, where a near-black overlay
    // just adds more darkness on top of an already-dark page.
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'rgba(24,28,40,' + ambientAlpha + ')';
    maskCtx.fillRect(0, 0, width, height);

    maskCtx.globalCompositeOperation = 'destination-out';
    candles.forEach(function (c) {
      if (c.state !== 'lit') return;
      punchLight(maskCtx, c.x, c.y - 20, LIGHT_RADIUS * Math.max(0.45, c.life));
    });
    // The shamash lights whatever it's over, whether it's resting in its
    // corner or being carried across the page.
    punchLight(maskCtx, carrier.x, carrier.y - 20, LIGHT_RADIUS * 1.15);

    maskCtx.globalCompositeOperation = 'lighter';
    candles.forEach(function (c) {
      if (c.state !== 'lit') return;
      glow(maskCtx, c.x, c.y - 20, LIGHT_RADIUS * 0.6 * Math.max(0.45, c.life));
    });
    glow(maskCtx, carrier.x, carrier.y - 20, LIGHT_RADIUS * 0.65);

    maskCtx.globalCompositeOperation = 'source-over';
  }

  function drawCandles() {
    candleCtx.clearRect(0, 0, width, height);
    candles.forEach(function (c) { updateCandle(c); });
    updateCarrierFlight();

    drawMask();

    candles.forEach(function (c) {
      drawCandleBody(candleCtx, c.x, c.y, c.z, c.state === 'lit' ? Math.max(0, c.life) : 0, 0);
      if (c.state === 'extinguished') drawSmoke(candleCtx, c);
    });

    carrier.tilt += (carrier.tiltTarget - carrier.tilt) * 0.2;
    drawCandleBody(candleCtx, carrier.x, carrier.y, 2.2, 1, carrier.tilt);
    positionHandle();
    positionCandleHandles();
  }

  function positionHandle() {
    if (!carrierHandle) return;
    carrierHandle.style.left = carrier.x + 'px';
    carrierHandle.style.top = carrier.y + 'px';
  }

  function positionCandleHandles() {
    candles.forEach(function (c, i) {
      var el = candleHandles[i];
      if (!el) return;
      el.style.left = c.x + 'px';
      el.style.top = c.y + 'px';
    });
  }

  function relight(c, tiltFromX) {
    c.state = 'lit';
    c.life = 1;
    c.smoke = [];
    c.dieAt = Math.min(1, scrollPercent() + 0.2 + Math.random() * 0.6);
    carrier.tiltTarget = tiltFromX > 0 ? 0.9 : -0.9;
    setTimeout(function () { carrier.tiltTarget = 0; }, 260);
  }

  // Bringing the lit carrier candle within reach of a dark one tips it
  // over and relights it — the whole point of carrying it in the first place.
  function tryRelight() {
    candles.forEach(function (c) {
      if (c.state !== 'extinguished') return;
      var dx = c.x - carrier.x, dy = (c.y - 20) - carrier.y;
      if (Math.sqrt(dx * dx + dy * dy) < RELIGHT_RADIUS) relight(c, dx);
    });
  }

  // ── Tap-to-send: for touch, dragging the shamash precisely is unreliable
  // (the page wants to scroll, a thumb covers the target). Tapping an
  // extinguished candle instead sends the shamash on a slow, watchable
  // flight over to it, tilts to relight it, pauses, then flies home —
  // a little ritual rather than an instant teleport.
  var FLIGHT_MS = 2000;

  function sendShamashTo(candle) {
    if (carrier.dragging || carrier.mode !== 'idle') return;
    carrier.mode = 'flying-out';
    carrier.targetCandle = candle;
    carrier.flightFrom = { x: carrier.x, y: carrier.y };
    carrier.flightTo = { x: candle.x, y: candle.y - 20 };
    carrier.flightStart = performance.now();
  }

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function updateCarrierFlight() {
    if (carrier.dragging) { carrier.mode = 'idle'; return; }
    if (carrier.mode !== 'flying-out' && carrier.mode !== 'flying-back') return;

    const t = Math.min(1, (performance.now() - carrier.flightStart) / FLIGHT_MS);
    const e = easeInOut(t);
    carrier.x = carrier.flightFrom.x + (carrier.flightTo.x - carrier.flightFrom.x) * e;
    carrier.y = carrier.flightFrom.y + (carrier.flightTo.y - carrier.flightFrom.y) * e;
    if (t < 1) return;

    if (carrier.mode === 'flying-out') {
      const c = carrier.targetCandle;
      if (c && c.state === 'extinguished') relight(c, c.x - carrier.x);
      // Pause a beat at the newly-lit candle before heading home, so the
      // relighting itself is the moment the eye lands on, not a blur.
      setTimeout(function () {
        carrier.mode = 'flying-back';
        carrier.flightFrom = { x: carrier.x, y: carrier.y };
        carrier.flightTo = { x: carrier.homeX, y: carrier.homeY };
        carrier.flightStart = performance.now();
      }, 700);
      carrier.mode = 'paused'; // holds position during the setTimeout above
    } else {
      carrier.mode = 'idle';
    }
  }

  function attachDrag() {
    carrierHandle.addEventListener('pointerdown', function (e) {
      carrier.dragging = true;
      carrier.grabDX = carrier.x - e.clientX;
      carrier.grabDY = carrier.y - e.clientY;
      carrierHandle.setPointerCapture(e.pointerId);
      carrierHandle.style.cursor = 'grabbing';
    });
    carrierHandle.addEventListener('pointermove', function (e) {
      if (!carrier.dragging) return;
      carrier.x = e.clientX + carrier.grabDX;
      carrier.y = e.clientY + carrier.grabDY;
      tryRelight();
    });
    function release() { carrier.dragging = false; carrierHandle.style.cursor = 'grab'; }
    carrierHandle.addEventListener('pointerup', release);
    carrierHandle.addEventListener('pointercancel', release);
  }

  /* ================= mount / unmount ================= */
  function buildLayer(id, z) {
    var c = document.createElement('canvas');
    c.id = id;
    Object.assign(c.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
      zIndex: String(z), pointerEvents: 'none'
    });
    document.body.appendChild(c);
    return c;
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    dnaCanvas = buildLayer('veil-dna-layer', 1);
    dnaCanvas.style.opacity = '0.6';
    dnaCtx = dnaCanvas.getContext('2d');

    // Stacked well above any existing site chrome (nav/panels top out
    // around z:300) so the darkness always wins, with the candle
    // sprites just above the mask so flames poke through it.
    maskCanvas = buildLayer('veil-mask-layer', 500);
    maskCtx = maskCanvas.getContext('2d');

    candleCanvas = buildLayer('veil-candle-layer', 501);
    candleCanvas.style.mixBlendMode = 'screen';
    candleCtx = candleCanvas.getContext('2d');

    carrierHandle = document.createElement('div');
    carrierHandle.id = 'veil-carrier-handle';
    carrierHandle.title = 'Carry this flame to a dark candle to relight it';
    Object.assign(carrierHandle.style, {
      position: 'fixed', width: '44px', height: '84px',
      transform: 'translate(-50%, -70%)', zIndex: '502',
      cursor: 'grab', touchAction: 'none', pointerEvents: 'auto', background: 'transparent'
    });
    document.body.appendChild(carrierHandle);

    resize();
    resetCandles();
    placeCarrier();
    attachDrag();
    buildCandleHandles();
    window.addEventListener('resize', resize);

    (function loop() {
      if (!mounted) return;
      drawDNA();
      drawCandles();
      raf = requestAnimationFrame(loop);
    })();
  }

  function buildCandleHandles() {
    candleHandles = candles.map(function (c) {
      var el = document.createElement('div');
      el.className = 'veil-candle-handle';
      el.title = 'Tap to send the shamash over to relight this candle';
      Object.assign(el.style, {
        position: 'fixed', width: '48px', height: '76px',
        transform: 'translate(-50%, -60%)', zIndex: '501',
        pointerEvents: 'auto', cursor: 'pointer', touchAction: 'manipulation', background: 'transparent'
      });
      el.addEventListener('click', function () {
        if (c.state === 'extinguished') sendShamashTo(c);
      });
      document.body.appendChild(el);
      return el;
    });
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    if (raf) cancelAnimationFrame(raf);
    [dnaCanvas, maskCanvas, candleCanvas, carrierHandle].concat(candleHandles).forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    dnaCanvas = maskCanvas = candleCanvas = carrierHandle = null;
    candleHandles = [];
    window.removeEventListener('resize', resize);
  }

  function syncToTheme(theme) {
    if (theme === ACTIVE_THEME) mount(); else unmount();
  }

  function init() {
    syncToTheme(document.documentElement.getAttribute('data-theme') || 'patina');
    document.addEventListener('feisttech-theme-change', function (e) { syncToTheme(e.detail.theme); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VeilTheme = {
    mount: mount, unmount: unmount,
    _debug: function () { return { candles: candles, carrier: carrier }; }
  };
})();
