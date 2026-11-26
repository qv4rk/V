import * as THREE from './vendor/three.module.js';

// Small-body overlays used by the Atlas's existing Solar system view.
// Distances are AU and the host uses 15 scene units per AU.
const DEG = Math.PI / 180, MU = 0.0002959122082855911, SCALE = 15;
const OUMUAMUA = { q: 0.2559115812, e: 1.201133796, i: 122.7417062, O: 24.59690691, w: 241.8105360, tp: 2458006.007 };
OUMUAMUA.a = OUMUAMUA.q / (1 - OUMUAMUA.e);
const NINE = { a: 380, e: 0.2, i: 16, O: 97, w: 150, period: 12000, phase: 180 };
const SWIFT = { a: 26.092, e: 0.9632, i: 113.453, O: 139.381, w: 152.982 };
const NODE = Math.PI - SWIFT.w * DEG;

function orbitPoint(el, E) {
  let x, y;
  if (el.e < 1) {
    x = el.a * (Math.cos(E) - el.e);
    y = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  } else {
    x = el.a * (Math.cosh(E) - el.e);
    y = -el.a * Math.sqrt(el.e * el.e - 1) * Math.sinh(E);
  }
  const cw = Math.cos(el.w * DEG), sw = Math.sin(el.w * DEG);
  const cO = Math.cos(el.O * DEG), sO = Math.sin(el.O * DEG);
  const ci = Math.cos(el.i * DEG), si = Math.sin(el.i * DEG);
  const xp = x * cw - y * sw, yp = x * sw + y * cw;
  return new THREE.Vector3(xp * cO - yp * ci * sO, xp * sO + yp * ci * cO, yp * si);
}
function pointAtNu(el, nu) {
  const E = 2 * Math.atan2(Math.sqrt(1 - el.e) * Math.sin(nu / 2), Math.sqrt(1 + el.e) * Math.cos(nu / 2));
  return orbitPoint(el, E);
}
function line(points, color, opacity = 0.75) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
function marker(name, color) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color }));
  mesh.name = name; mesh.userData.type = 'small-body';
  const dot = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)),
    new THREE.PointsMaterial({ color, size: 8, sizeAttenuation: false }));
  mesh.add(dot); return mesh;
}
function julianDay(date) { return date.getTime() / 864e5 + 2440587.5; }
const scenePoint = v => new THREE.Vector3(v.x, v.z, -v.y).multiplyScalar(SCALE);
function hyperbolicPosition(date) {
  const jd = julianDay(date), n = Math.sqrt(MU / Math.pow(-OUMUAMUA.a, 3));
  const M = n * (jd - OUMUAMUA.tp); let H = Math.asinh(M / OUMUAMUA.e);
  for (let i = 0; i < 40; i++) {
    const d = (OUMUAMUA.e * Math.sinh(H) - H - M) / (OUMUAMUA.e * Math.cosh(H) - 1);
    H -= d; if (Math.abs(d) < 1e-12) break;
  }
  return orbitPoint(OUMUAMUA, H);
}
function ninePosition(date) {
  const jd = julianDay(date), n = 2 * Math.PI / (NINE.period * 365.25);
  const M = NINE.phase * DEG + n * (jd - 2451545);
  let E = M;
  for (let i = 0; i < 20; i++) E -= (E - NINE.e * Math.sin(E) - M) / (1 - NINE.e * Math.cos(E));
  return orbitPoint(NINE, E);
}
function streamPoint(nu) { return pointAtNu(SWIFT, nu); }

export function createPhenomena(scene) {
  const root = new THREE.Group(); root.name = 'Atlas small-body and meteor overlays'; scene.add(root);
  const oumuamua = new THREE.Group(), nine = new THREE.Group(), perseids = new THREE.Group();
  root.add(oumuamua, nine, perseids);
  const oPath = []; for (let h = -2.6; h <= 2.601; h += 0.025) oPath.push(scenePoint(orbitPoint(OUMUAMUA, h)));
  oumuamua.add(line(oPath, 0x59d9e8, 0.72));
  const oMarker = marker('ʻOumuamua', 0x59d9e8); oumuamua.add(oMarker);
  const nPath = []; for (let k = 0; k <= 512; k++) nPath.push(scenePoint(orbitPoint(NINE, 2 * Math.PI * k / 512)));
  nine.add(line(nPath, 0xe083ff, 0.62));
  const nMarker = marker('Planet Nine · hypothetical', 0xe083ff); nine.add(nMarker);

  const pPath = []; for (let k = -100; k <= 100; k++) pPath.push(scenePoint(streamPoint(NODE + k * 0.055 * DEG)));
  perseids.add(line(pPath, 0xffa24a, 0.9));
  const positions = []; let seed = 109133;
  const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const inc = SWIFT.i * DEG, node = SWIFT.O * DEG;
  const normal = new THREE.Vector3(Math.sin(inc) * Math.sin(node), -Math.sin(inc) * Math.cos(node), Math.cos(inc));
  for (let k = 0; k < 900; k++) {
    const u = (rand() + rand() + rand() - 1.5) * 2.8 * DEG, p = streamPoint(NODE + u);
    const width = 0.003 + Math.abs(u) * 0.025;
    const off = normal.clone().multiplyScalar((rand() * 2 - 1) * width);
    const cross = p.clone().normalize().cross(normal).normalize().multiplyScalar((rand() * 2 - 1) * width);
    positions.push((p.x + off.x + cross.x) * SCALE, (p.z + off.z + cross.z) * SCALE, -(p.y + off.y + cross.y) * SCALE);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  perseids.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xe7bd68, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.52, depthWrite: false })));
  // A screen-sized point marks the orbit crossing. A spherical marker reads as a planet
  // when the camera focuses here, so the Perseid layer intentionally has no 3-D body.
  const pMarker = new THREE.Points(new THREE.BufferGeometry().setAttribute('position',
    new THREE.Float32BufferAttribute(scenePoint(streamPoint(NODE)).toArray(), 3)),
    new THREE.PointsMaterial({ color: 0xffd98a, size: 6, sizeAttenuation: false }));
  pMarker.name = 'Perseid stream · Earth crossing'; pMarker.userData.type = 'small-body'; perseids.add(pMarker);
  perseids.userData.description = 'Orbital dust-stream schematic; not individual meteor paths.';

  const stations = new THREE.Group(); stations.name = 'Satellites'; root.add(stations);
  const iss = marker('ISS · live TLE', 0x76e6ff); stations.add(iss);
  stations.visible = false;
  const satOrbit = line([], 0x76e6ff, 0.5); stations.add(satOrbit);
  const groups = { oumuamua, nine, perseids, satellites: stations };
  const positionsByName = {};
  function update(date) {
    const o = scenePoint(hyperbolicPosition(date)); oMarker.position.copy(o); positionsByName.oumuamua = o;
    const n = scenePoint(ninePosition(date)); nMarker.position.copy(n); positionsByName.nine = n;
  }
  update(new Date());
  return { root, groups, markers: [oMarker, nMarker, pMarker, iss], positions: positionsByName,
    update, streamNode: scenePoint(streamPoint(NODE)), satelliteMarker: iss,
    setSatellitePosition(p) { iss.position.copy(p); positionsByName.satellites = iss.position; },
    setSatelliteOrbit(points) { satOrbit.geometry.dispose(); satOrbit.geometry.setFromPoints(points); } };
}
