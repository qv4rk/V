// Extra camera gestures on top of OrbitControls:
//   1 finger   orbit around the target              (OrbitControls)
//   2 fingers  pinch zoom + drag pan                 (OrbitControls)
//              + twist to roll the view              (here)
//   3 fingers  drag to turn where you're pointing    (here)
//              quick tap: level the view (up = ecliptic north)
// Desktop: Shift+drag looks around, Q / E roll, R levels.
import * as THREE from 'three';

export function attachGestures(controls, getCamera, dom, onLook = () => {}) {
  const cam = () => getCamera();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), q = new THREE.Quaternion();

  // OrbitControls caches the "up" frame at construction; refresh it after a roll
  function syncUp() {
    controls._quat.setFromUnitVectors(cam().up, new THREE.Vector3(0, 1, 0));
    controls._quatInverse.copy(controls._quat).invert();
  }
  function roll(angle) {
    const c = cam();
    fwd.subVectors(controls.target, c.position).normalize();
    c.up.applyQuaternion(q.setFromAxisAngle(fwd, angle)).normalize();
    syncUp();
    c.lookAt(controls.target);
  }
  // Turn the view direction about the camera itself: the camera stays put and
  // the point it orbits moves, keeping the same distance.
  function look(dx, dy) {
    onLook();                                   // stop riding along with a planet
    const c = cam();
    const off = new THREE.Vector3().subVectors(controls.target, c.position);
    const dist = off.length();
    off.normalize();
    right.crossVectors(off, c.up).normalize();
    off.applyQuaternion(q.setFromAxisAngle(c.up, -dx * 0.004));
    const pitched = off.clone().applyQuaternion(q.setFromAxisAngle(right, -dy * 0.004));
    if (Math.abs(pitched.dot(c.up)) < 0.995) off.copy(pitched);
    controls.target.copy(c.position).addScaledVector(off, dist);
    c.lookAt(controls.target);
  }
  function level() {
    const c = cam();
    c.up.set(0, 1, 0);
    syncUp();
    c.lookAt(controls.target);
  }

  // ── Touch ──
  let three = null, twist = null, tapStart = 0, tapMoved = false;
  const centroid = ts => [0, 1, 2].reduce((a, i) => [a[0] + ts[i].clientX / 3, a[1] + ts[i].clientY / 3], [0, 0]);
  const angleOf = ts => Math.atan2(ts[1].clientY - ts[0].clientY, ts[1].clientX - ts[0].clientX);

  dom.addEventListener('touchstart', e => {
    if (e.touches.length === 3) {
      controls.enabled = false;
      three = centroid(e.touches);
      tapStart = performance.now(); tapMoved = false;
      twist = null;
    } else if (e.touches.length === 2) {
      twist = angleOf(e.touches);
    }
  }, { passive: true, capture: true });

  dom.addEventListener('touchmove', e => {
    if (e.touches.length === 3 && three) {
      const c = centroid(e.touches);
      const dx = c[0] - three[0], dy = c[1] - three[1];
      if (Math.hypot(dx, dy) > 4) tapMoved = true;
      look(dx, dy);
      three = c;
    } else if (e.touches.length === 2 && twist !== null) {
      const a = angleOf(e.touches);
      let d = a - twist;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      if (Math.abs(d) > 0.004) roll(-d);
      twist = a;
    }
  }, { passive: true, capture: true });

  dom.addEventListener('touchend', e => {
    if (three && e.touches.length < 3) {
      if (!tapMoved && performance.now() - tapStart < 300) level();
      three = null;
      controls.enabled = true;
    }
    if (e.touches.length < 2) twist = null;
  }, { passive: true, capture: true });

  // ── Desktop ──
  let shiftDrag = null;
  dom.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.shiftKey) { shiftDrag = [e.clientX, e.clientY]; controls.enabled = false; }
  }, { capture: true });
  addEventListener('pointermove', e => {
    if (!shiftDrag) return;
    look(e.clientX - shiftDrag[0], e.clientY - shiftDrag[1]);
    shiftDrag = [e.clientX, e.clientY];
  });
  addEventListener('pointerup', () => { if (shiftDrag) { shiftDrag = null; controls.enabled = true; } });
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'q' || e.key === 'Q') roll(0.05);
    else if (e.key === 'e' || e.key === 'E') roll(-0.05);
    else if (e.key === 'r' || e.key === 'R') level();
  });

  return { roll, look, level };
}
