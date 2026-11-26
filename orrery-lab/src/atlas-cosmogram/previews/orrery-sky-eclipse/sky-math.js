// Equatorial sky geometry. Angles are degrees, longitude is east positive.
const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const EARTH_A = 6378.137;
const EARTH_E2 = 0.00669437999014;
const clamp = (x) => Math.max(-1, Math.min(1, x));
const rad = (x) => x * DEG;
const degrees = (x) => x / DEG;

export function gmstDegrees(jd) {
  const T = (jd - 2451545) / 36525;
  return ((280.46061837 + 360.98564736629 * (jd - 2451545) +
    0.000387933 * T * T - T * T * T / 38710000) % 360 + 360) % 360;
}

export function equatorialVector(ra, dec, distance = 1) {
  const a = rad(ra), d = rad(dec);
  return { x: distance * Math.cos(d) * Math.cos(a),
    y: distance * Math.cos(d) * Math.sin(a), z: distance * Math.sin(d) };
}

export function observerVector(jd, lat, lon) {
  const f = rad(lat), t = rad(gmstDegrees(jd) + lon);
  const n = EARTH_A / Math.sqrt(1 - EARTH_E2 * Math.sin(f) ** 2);
  return { x: n * Math.cos(f) * Math.cos(t) / AU_KM,
    y: n * Math.cos(f) * Math.sin(t) / AU_KM,
    z: n * (1 - EARTH_E2) * Math.sin(f) / AU_KM };
}

export function topocentric(ra, dec, distanceAu, jd, lat, lon) {
  const p = equatorialVector(ra, dec, distanceAu);
  const o = observerVector(jd, lat, lon);
  return { x: p.x - o.x, y: p.y - o.y, z: p.z - o.z };
}

export function localDirection(vector, jd, lat, lon) {
  const t = rad(gmstDegrees(jd) + lon), f = rad(lat);
  const { x, y, z } = vector;
  const east = -Math.sin(t) * x + Math.cos(t) * y;
  const north = -Math.sin(f) * Math.cos(t) * x - Math.sin(f) * Math.sin(t) * y + Math.cos(f) * z;
  const up = Math.cos(f) * Math.cos(t) * x + Math.cos(f) * Math.sin(t) * y + Math.sin(f) * z;
  const length = Math.hypot(east, north, up);
  return { x: east / length, y: up / length, z: -north / length,
    altitude: degrees(Math.asin(clamp(up / length))) };
}

export function precessJ2000(ra, dec, jd) {
  const T = (jd - 2451545) / 36525;
  const zeta = rad((2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600);
  const z = rad((2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) / 3600);
  const theta = rad((2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600);
  const a = rad(ra) + zeta, d = rad(dec);
  const A = Math.cos(d) * Math.sin(a);
  const B = Math.cos(theta) * Math.cos(d) * Math.cos(a) - Math.sin(theta) * Math.sin(d);
  const C = Math.sin(theta) * Math.cos(d) * Math.cos(a) + Math.cos(theta) * Math.sin(d);
  return { ra: degrees(Math.atan2(A, B) + z), dec: degrees(Math.asin(clamp(C))) };
}

export function eclipticJ2000ToEquatorial(p) {
  const e = rad(23.4392911);
  return { x:p.x, y:p.y * Math.cos(e) - p.z * Math.sin(e),
    z:p.y * Math.sin(e) + p.z * Math.cos(e) };
}

export function vectorToRaDec(p) {
  return { ra: degrees(Math.atan2(p.y, p.x)), dec: degrees(Math.atan2(p.z, Math.hypot(p.x, p.y))),
    distance: Math.hypot(p.x, p.y, p.z) };
}

export function angularSeparation(a, b) {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const length = Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z);
  return degrees(Math.acos(clamp(dot / length)));
}

// NASA RP 1398, Table 1/2, greatest eclipse: DE200/LE200 apparent
// geocentric coordinates and hourly rates. Valid here only near this event.
export const ECLIPSE_1999 = Object.freeze({
  jd: 2451401.9604677, lat:45.075, lon:24.3,
  sun: { ra:(9 + 23/60 + 8.297/3600)*15, dec:15 + 19/60 + 39.72/3600,
    radius:(15 + 46.77/60)/60, parallax:8.68/3600, raRate:9.467*15/3600, decRate:-44.35/3600 },
  moon: { ra:(9 + 23/60 + 34.531/3600)*15, dec:15 + 48/60 + 38.51/3600,
    radius:(16 + 0.34/60)/60, parallax:(58 + 44.24/60)/60, raRate:142.037*15/3600, decRate:-462.21/3600 }
});

export function nasa1999Body(name, jd) {
  if (Math.abs(jd - ECLIPSE_1999.jd) > 10 / 1440) return null;
  const b = ECLIPSE_1999[name];
  const hours = (jd - ECLIPSE_1999.jd) * 24;
  return { ra:b.ra + hours*b.raRate, dec:b.dec + hours*b.decRate,
    distance:EARTH_A / Math.sin(rad(b.parallax)) / AU_KM, radius:b.radius };
}
