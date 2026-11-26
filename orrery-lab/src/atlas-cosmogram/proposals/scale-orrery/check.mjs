// node atlas-cosmogram/proposals/scale-orrery/check.mjs
// Checks the proposal's positions against dated events, and prints the live
// atlas ephemeris on the same events for comparison. No dependencies.

import { geocentric, heliocentric, eclipticToScene } from './elements.js';
import { dateToJulianDay, getGeoCoordinates } from '../../js/ephemeris.js';
import { moonOfDate, eclipseAt } from './moon.js';
import { galileanPosition } from './galilean.js';
import { readFileSync } from 'fs';

const here = (f) => new URL(f, import.meta.url);
const HZ = JSON.parse(readFileSync(here('./fixtures/horizons.json'), 'utf8'));
const ECLIPSES = JSON.parse(readFileSync(here('../../data/eclipses.json'), 'utf8'));

const RAD = 180 / Math.PI;
const SUN_RADIUS_DEG = 0.267; // apparent solar radius, roughly, near 1 AU

const sep = (a, b) => {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const n = Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z);
  return Math.acos(Math.max(-1, Math.min(1, dot / n))) * RAD;
};
const dist = (v) => Math.hypot(v.x, v.y, v.z);
const sunGeo = (jd) => {
  const e = heliocentric('earth', jd);
  return { x: -e.x, y: -e.y, z: -e.z };
};

// [label, jd, measure(geo, jd) -> number, limit, unit]
// Event times are UT from published transit and opposition tables.
const onDisc = (body) => (geo, jd) => sep(geo(body, jd), geo('sun', jd));
const atlasGeo = (body, jd) => getGeoCoordinates(body, jd);
const propGeo = (body, jd) => (body === 'sun' ? sunGeo(jd) : geocentric(body, jd));

const CASES = [
  ['Venus transit, greatest, 1874-12-09 04:07', dateToJulianDay(1874, 12, 9, 4, 7), onDisc('venus'), SUN_RADIUS_DEG, 'deg from Sun centre'],
  ['Venus transit, greatest, 1882-12-06 17:06', dateToJulianDay(1882, 12, 6, 17, 6), onDisc('venus'), SUN_RADIUS_DEG, 'deg from Sun centre'],
  ['Venus transit, greatest, 2012-06-06 01:29', dateToJulianDay(2012, 6, 6, 1, 29), onDisc('venus'), SUN_RADIUS_DEG, 'deg from Sun centre'],
  ['Mercury transit, greatest, 2019-11-11 15:20', dateToJulianDay(2019, 11, 11, 15, 20), onDisc('mercury'), SUN_RADIUS_DEG, 'deg from Sun centre'],
  ['Jupiter-Saturn conjunction 2020-12-21 18:20 (0.10 deg)', dateToJulianDay(2020, 12, 21, 18, 20),
    (geo, jd) => sep(geo('jupiter', jd), geo('saturn', jd)), 0.25, 'deg apart'],
  ['Mars closest approach 2003-08-27 09:51 (0.37272 AU)', dateToJulianDay(2003, 8, 27, 9, 51),
    (geo, jd) => Math.abs(dist(geo('mars', jd)) - 0.37272), 0.001, 'AU off']
];

let failed = 0;
for (const [label, jd, measure, limit, unit] of CASES) {
  const p = measure(propGeo, jd);
  const a = measure(atlasGeo, jd);
  const ok = p <= limit;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}\n` +
    `      proposal ${p.toFixed(4)} ${unit} (limit ${limit})   live atlas ${a.toFixed(4)}`
  );
}

// Handedness: Earth moves counter-clockwise seen from +Y in scene space.
const s0 = eclipticToScene(heliocentric('earth', 2451545));
const s1 = eclipticToScene(heliocentric('earth', 2451545 + 10));
// The y component of s0 x s1 is positive for a counter-clockwise turn about +Y.
const crossY = s0.z * s1.x - s0.x * s1.z;
const ccw = crossY > 0;
if (!ccw) failed++;
console.log(`${ccw ? 'PASS' : 'FAIL'}  Earth orbits counter-clockwise about +Y in scene space`);

// Same test on the live atlas mapping (x, z, y) from scene-a.js.
const a0 = heliocentric('earth', 2451545), a1 = heliocentric('earth', 2451545 + 10);
const atlasCrossY = a0.y * a1.x - a0.x * a1.y;
console.log(`info  live atlas mapping (x, z, y) turns ${atlasCrossY > 0 ? 'counter-clockwise' : 'clockwise'} about +Y`);

// Moon against JPL Horizons (apparent ecliptic of date, so nutation and
// aberration, about 0.005 deg, are left in the difference).
for (const h of HZ.moon) {
  const m = moonOfDate(h.jdUT);
  const dLon = Math.abs((((m.lon - h.lon) % 360) + 540) % 360 - 180);
  const dLat = Math.abs(m.lat - h.lat);
  const ancient = h.jdUT < 2378496.5; // before 1800: delta T is uncertain
  const limit = ancient ? 0.1 : 0.02;
  const ok = dLon < limit && dLat < limit;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Moon vs Horizons ${h.label}: dLon ${dLon.toFixed(4)} dLat ${dLat.toFixed(4)} deg (limit ${limit})`);
}

// Galilean moons against Horizons, angle around Jupiter.
const NAMES = { 501: 'io', 502: 'europa', 503: 'ganymede', 504: 'callisto' };
for (const [id, rows] of Object.entries(HZ.galilean)) {
  let worst = 0;
  for (const r of rows) worst = Math.max(worst, sep(galileanPosition(NAMES[id], r.jdTDB), { x: r.km[0], y: r.km[1], z: r.km[2] }));
  const ok = worst < 1.5;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${NAMES[id]} vs Horizons 1800-2050: worst ${worst.toFixed(3)} deg (limit 1.5)`);
}

// Every eclipse preset: the Moon must sit where NASA's gamma puts it.
// gamma is the distance of the shadow axis from Earth's centre in Earth radii,
// so the geocentric separation at greatest eclipse is about |gamma| x parallax.
for (const e of ECLIPSES) {
  const kind = e.type.includes('lunar') ? 'lunar' : 'solar';
  const g = eclipseAt(e.jd, kind);
  const gamma = Number(/gamma (-?[\d.]+)/.exec(e.source)[1]);
  const expected = Math.abs(gamma) * g.parallax;
  const off = Math.abs(g.sep - expected);
  const ok = g.ok && off < 0.15;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${e.name} (${e.year}): Moon ${g.sep.toFixed(3)} deg from ${kind === 'solar' ? 'Sun' : 'shadow centre'}, NASA gamma gives ${expected.toFixed(3)}`);
}

process.exit(failed ? 1 : 0);
