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
  var LIGHT_RADIUS = 130;        // how far a lit candle's window into the dark reaches
  var RELIGHT_RADIUS = 46;       // how close the shamash has to physically get to relight
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
  var carrier = { x: 0, y: 0, dragging: false, tilt: 0, tiltTarget: 0, grabDX: 0, grabDY: 0 };

  function placeCarrier() {
    if (!carrier.dragging) { carrier.x = width - 70; carrier.y = height - 110; }
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
  // meant to hold your eye. The text it reveals is.
  function drawCandleBody(ctx, x, y, z, flameStrength, tilt) {
    var scale = z * 0.6;
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 * z) + ')';
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
    g.addColorStop(0.65, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMask() {
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'rgba(2,2,2,0.94)';
    maskCtx.fillRect(0, 0, width, height);

    maskCtx.globalCompositeOperation = 'destination-out';
    candles.forEach(function (c) {
      if (c.state !== 'lit') return;
      punchLight(maskCtx, c.x, c.y - 20, LIGHT_RADIUS * Math.max(0.35, c.life));
    });
    // The shamash lights whatever it's over, whether it's resting in its
    // corner or being carried across the page.
    punchLight(maskCtx, carrier.x, carrier.y - 20, LIGHT_RADIUS * 1.05);
    maskCtx.globalCompositeOperation = 'source-over';
  }

  function drawCandles() {
    candleCtx.clearRect(0, 0, width, height);
    candles.forEach(function (c) { updateCandle(c); });

    drawMask();

    candles.forEach(function (c) {
      drawCandleBody(candleCtx, c.x, c.y, c.z, c.state === 'lit' ? Math.max(0, c.life) : 0, 0);
      if (c.state === 'extinguished') drawSmoke(candleCtx, c);
    });

    carrier.tilt += (carrier.tiltTarget - carrier.tilt) * 0.2;
    drawCandleBody(candleCtx, carrier.x, carrier.y, 2.2, 1, carrier.tilt);
    positionHandle();
  }

  function positionHandle() {
    if (!carrierHandle) return;
    carrierHandle.style.left = carrier.x + 'px';
    carrierHandle.style.top = carrier.y + 'px';
  }

  // Bringing the lit carrier candle within reach of a dark one tips it
  // over and relights it — the whole point of carrying it in the first place.
  function tryRelight() {
    candles.forEach(function (c) {
      if (c.state !== 'extinguished') return;
      var dx = c.x - carrier.x, dy = (c.y - 20) - carrier.y;
      if (Math.sqrt(dx * dx + dy * dy) < RELIGHT_RADIUS) {
        carrier.tiltTarget = dx > 0 ? 0.9 : -0.9;
        c.state = 'lit';
        c.life = 1;
        c.smoke = [];
        c.dieAt = Math.min(1, scrollPercent() + 0.2 + Math.random() * 0.6);
        setTimeout(function () { carrier.tiltTarget = 0; }, 260);
      }
    });
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
    window.addEventListener('resize', resize);

    (function loop() {
      if (!mounted) return;
      drawDNA();
      drawCandles();
      raf = requestAnimationFrame(loop);
    })();
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    if (raf) cancelAnimationFrame(raf);
    [dnaCanvas, maskCanvas, candleCanvas, carrierHandle].forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    dnaCanvas = maskCanvas = candleCanvas = carrierHandle = null;
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
