/**
 * Shared Google Earth-style controller.
 * The overlay owns all pointer/wheel input and updates one camera state
 * that every visible layer receives through setCamera.
 *
 * State is Earth-centred:
 *   lat, lon   — look-at point on Earth (degrees)
 *   heightKm   — distance from that point (km), log-scaled on pinch/wheel
 *   yaw        — heading, radians (0 = north)
 *   pitch      — tilt from nadir, radians (0 = looking straight down, ~π/2 = horizon)
 *   roll       — bank, radians
 *   fov        — vertical field of view, degrees
 */
export const HEIGHT_MIN_KM = 0.04;       // ~40 m, street level
export const HEIGHT_MAX_KM = 6e9;        // past Pluto
export const PITCH_MAX = Math.PI / 2 - 0.04;

export function defaultCamera() {
  return {
    lat: 22,
    lon: -40,
    heightKm: 90000,
    yaw: 0,
    pitch: 0.18,
    roll: 0,
    fov: 45,
  };
}

export function cloneCamera(c) {
  return { ...c };
}

export function createCameraController(overlay, { onChange, onTap, onDoubleTap }) {
  let cam = defaultCamera();
  const pointers = new Map();
  let dragging = false;
  let moved = false;
  let lastTap = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let pendingTap = 0;
  let twoPrev = null;
  let threePrevY = null;
  const TAP_MS = 280;
  const TAP_SLOP = 14;
  const DBL_MS = 360;

  function emit() {
    cam.lat = clamp(cam.lat, -85, 85);
    cam.lon = wrapLon(cam.lon);
    cam.heightKm = clamp(cam.heightKm, HEIGHT_MIN_KM, HEIGHT_MAX_KM);
    cam.pitch = clamp(cam.pitch, 0, PITCH_MAX);
    cam.roll = clamp(cam.roll, -Math.PI, Math.PI);
    cam.fov = clamp(cam.fov, 12, 90);
    onChange?.(cloneCamera(cam));
  }

  function orbit(dx, dy, el) {
    const k = 0.005;
    cam.yaw -= dx * k;
    cam.pitch += dy * k;
    // Near nadir, yaw barely moves an Earth-mapped view, so also orbit the
    // look-at point: horizontal drag changes longitude, vertical changes latitude.
    cam.lon -= (dx * k * 180) / Math.PI;
    cam.lat -= (dy * k * 180) / Math.PI;
    emit();
  }

  function pan(dx, dy, el) {
    const h = el.clientHeight || 1;
    // metres represented by one viewport height at this range and fov
    const worldKm = 2 * cam.heightKm * Math.tan(((cam.fov * Math.PI) / 180) / 2);
    const kmPerPx = worldKm / h;
    const east = dx * kmPerPx;
    const north = -dy * kmPerPx;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const dE = east * cy - north * sy;
    const dN = east * sy + north * cy;
    const latRad = (cam.lat * Math.PI) / 180;
    const kmPerDegLat = 110.574;
    const kmPerDegLon = Math.max(20, 111.32 * Math.cos(latRad));
    cam.lon += dE / kmPerDegLon;
    cam.lat += dN / kmPerDegLat;
    emit();
  }

  function zoomBy(factor, cx, cy, el) {
    const prev = cam.heightKm;
    cam.heightKm = clamp(prev * factor, HEIGHT_MIN_KM, HEIGHT_MAX_KM);
    // Keep the point under (cx,cy) roughly stable by panning a fraction of the zoom
    if (el && (cx != null) && cam.heightKm !== prev) {
      const r = el.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      const dy = cy - (r.top + r.height / 2);
      const s = 1 - cam.heightKm / prev;
      pan(dx * s, dy * s, el);
    } else {
      emit();
    }
  }

  function rollBy(d) {
    cam.roll += d;
    emit();
  }

  function tiltBy(d) {
    cam.pitch += d;
    emit();
  }

  function onPointerDown(e) {
    // preventDefault stops Android Chrome from cancelling the pointer
    // (scroll/pinch takeover) and firing pointercancel mid-drag.
    if (e.cancelable) e.preventDefault();
    if (e.pointerType === "mouse") {
      try { overlay.setPointerCapture?.(e.pointerId); } catch (err) {}
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    moved = false;
    dragging = true;
    twoPrev = null;
    threePrevY = null;
  }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    if (e.cancelable) e.preventDefault();
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: prev.t });
    if (Math.hypot(dx, dy) > 8) moved = true;
    const pts = [...pointers.values()];
    const n = pts.length;

    if (n >= 3) {
      const y = pts.reduce((s, p) => s + p.y, 0) / n;
      if (threePrevY != null) tiltBy((y - threePrevY) * 0.006);
      threePrevY = y;
      return;
    }
    threePrevY = null;

    if (n === 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      if (twoPrev) {
        const dd = dist / twoPrev.dist;
        if (dd && isFinite(dd)) zoomBy(1 / dd, midX, midY, overlay);
        const da = ang - twoPrev.ang;
        if (Math.abs(da) > 0.0005) rollBy(da);
        pan(midX - twoPrev.x, midY - twoPrev.y, overlay);
      }
      twoPrev = { dist, ang, x: midX, y: midY };
      return;
    }
    twoPrev = null;

    if (n === 1 && dragging) {
      if (e.buttons === 2 || e.buttons === 4) {
        pan(dx, dy, overlay);
      } else if (e.ctrlKey) {
        rollBy(dx * 0.008);
      } else if (e.shiftKey) {
        tiltBy(dy * 0.008);
      } else {
        orbit(dx, dy, overlay);
      }
    }
  }

  function onPointerUp(e) {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!pointers.size) {
      dragging = false;
      twoPrev = null;
      threePrevY = null;
      if (!moved && p) {
        const now = performance.now();
        const isDbl = now - lastTap < DBL_MS && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < TAP_SLOP;
        if (isDbl) {
          clearTimeout(pendingTap);
          pendingTap = 0;
          lastTap = 0;
          zoomBy(0.35, e.clientX, e.clientY, overlay);
          onDoubleTap?.(e.clientX, e.clientY, overlay);
        } else {
          lastTap = now;
          lastTapX = e.clientX;
          lastTapY = e.clientY;
          clearTimeout(pendingTap);
          pendingTap = setTimeout(() => {
            pendingTap = 0;
            onTap?.(e.clientX, e.clientY, overlay);
          }, TAP_MS);
        }
      }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.0015);
    zoomBy(factor, e.clientX, e.clientY, overlay);
  }

  function onContext(e) { e.preventDefault(); }

  const opts = { passive: false };
  overlay.addEventListener("pointerdown", onPointerDown, opts);
  overlay.addEventListener("pointermove", onPointerMove, opts);
  overlay.addEventListener("pointerup", onPointerUp, opts);
  // Treat cancel as end, but preventDefault on down/move should make this rare.
  overlay.addEventListener("pointercancel", onPointerUp, opts);
  overlay.addEventListener("wheel", onWheel, opts);
  overlay.addEventListener("contextmenu", onContext);

  // Touch fallback for browsers that drop pointer events.
  // If a pointerdown already started the gesture, ignore native touches.
  let ignoreTouch = false;
  function eachTouch(e, fn) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      fn({
        pointerId: "t" + t.identifier,
        clientX: t.clientX,
        clientY: t.clientY,
        pointerType: "touch",
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        cancelable: false,
        preventDefault() {},
      });
    }
  }
  overlay.addEventListener("pointerdown", () => { ignoreTouch = true; }, opts);
  overlay.addEventListener("touchstart", (e) => {
    if (ignoreTouch) return;
    if (e.cancelable) e.preventDefault();
    eachTouch(e, onPointerDown);
  }, opts);
  overlay.addEventListener("touchmove", (e) => {
    if (ignoreTouch) return;
    if (e.cancelable) e.preventDefault();
    eachTouch(e, onPointerMove);
  }, opts);
  overlay.addEventListener("touchend", (e) => {
    if (ignoreTouch) { if (!e.touches.length) ignoreTouch = false; return; }
    if (e.cancelable) e.preventDefault();
    eachTouch(e, onPointerUp);
  }, opts);
  overlay.addEventListener("touchcancel", (e) => {
    if (ignoreTouch) { ignoreTouch = false; return; }
    eachTouch(e, onPointerUp);
  }, opts);

  return {
    getState: () => cloneCamera(cam),
    setState(next) {
      cam = { ...defaultCamera(), ...next };
      emit();
    },
    reset() {
      cam = defaultCamera();
      emit();
    },
    destroy() {
      clearTimeout(pendingTap);
      overlay.removeEventListener("pointerdown", onPointerDown);
      overlay.removeEventListener("pointermove", onPointerMove);
      overlay.removeEventListener("pointerup", onPointerUp);
      overlay.removeEventListener("pointercancel", onPointerUp);
      overlay.removeEventListener("wheel", onWheel);
      overlay.removeEventListener("contextmenu", onContext);
    },
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function wrapLon(lon) {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}
