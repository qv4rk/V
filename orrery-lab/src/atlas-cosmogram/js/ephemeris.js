const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const ELEMENTS = {
  mercury: {
    a: 0.387098, e: 0.205630, i: 7.005, L: 252.251, peri: 77.456, node: 48.331,
    n: 149472.674,
    period: 87.969
  },
  venus: {
    a: 0.723332, e: 0.006773, i: 3.395, L: 181.980, peri: 131.603, node: 76.680,
    period: 224.701
  },
  earth: {
    a: 1.000000, e: 0.016711, i: 0.000, L: 100.464, peri: 102.937, node: 0.0,
    period: 365.256
  },
  mars: {
    a: 1.523679, e: 0.093399, i: 1.850, L: 355.453, peri: 336.040, node: 49.562,
    period: 686.980
  },
  jupiter: {
    a: 5.20260, e: 0.048498, i: 1.303, L: 34.404, peri: 14.331, node: 100.464,
    period: 4332.589
  },
  saturn: {
    a: 9.55491, e: 0.055546, i: 2.489, L: 49.944, peri: 93.057, node: 113.665,
    period: 10759.22
  },
  uranus: {
    a: 19.2184, e: 0.046295, i: 0.773, L: 313.232, peri: 170.964, node: 74.006,
    period: 30688.5
  },
  neptune: {
    a: 30.1104, e: 0.009457, i: 1.770, L: 304.880, peri: 44.971, node: 131.784,
    period: 60182
  }
};
const PLANET_COLORS = {
  sun: 0xffdd66,
  mercury: 0xb0b0b0,
  venus: 0xe8c87a,
  earth: 0x4a90d9,
  mars: 0xc1440e,
  jupiter: 0xd4a574,
  saturn: 0xe8d4a0,
  uranus: 0xa8e4e8,
  neptune: 0x4068d0
};
export function dateToJulianDay(year, month, day, hour = 12, minute = 0, second = 0) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const isGregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  const B = isGregorian ? 2 - A + Math.floor(A / 4) : 0;
  const dayFraction = (hour + minute / 60 + second / 3600) / 24;
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5 +
    dayFraction;
  return jd;
}
export function jdToCalendar(jd) {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const dayInt = Math.floor(day);
  const frac = day - dayInt;
  const hours = frac * 24;
  const hour = Math.floor(hours);
  const minute = Math.floor((hours - hour) * 60);
  return { year, month, day: dayInt, hour, minute };
}
export function yearFromJd(jd) {
  return jdToCalendar(jd).year;
}
function wrap360(x) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}
function solveKepler(Mdeg, e, iterations = 12) {
  let M = Mdeg * DEG;
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < iterations; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}
export function getHelioCoordinates(body, jd) {
  if (body === 'sun') {
    return { x: 0, y: 0, z: 0, name: 'sun' };
  }
  const el = ELEMENTS[body];
  if (!el) return { x: 0, y: 0, z: 0, name: body };
  const T = (jd - 2451545.0) / 36525;
  const n = 360 / el.period;
  const M0 = wrap360(el.L - el.peri);
  const M = wrap360(M0 + n * (jd - 2451545.0));
  const E = solveKepler(M, el.e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xv = el.a * (cosE - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * sinE;
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const peri = (el.peri + T * 0.5) * DEG;
  const node = el.node * DEG;
  const i = el.i * DEG;
  const w = peri - node;
  const cosO = Math.cos(node);
  const sinO = Math.sin(node);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);
  const cosvw = Math.cos(v + w);
  const sinvw = Math.sin(v + w);
  const x = r * (cosO * cosvw - sinO * sinvw * cosi);
  const y = r * (sinO * cosvw + cosO * sinvw * cosi);
  const z = r * (sinvw * sini);
  return { x, y, z, r, name: body };
}
export function getAllBodies(jd) {
  const names = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const out = {};
  for (const n of names) {
    out[n] = getHelioCoordinates(n, jd);
  }
  return out;
}
export function getGeoCoordinates(body, jd) {
  const earth = getHelioCoordinates('earth', jd);
  if (body === 'earth') return { x: 0, y: 0, z: 0, name: 'earth' };
  if (body === 'sun') {
    return { x: -earth.x, y: -earth.y, z: -earth.z, name: 'sun' };
  }
  const helio = getHelioCoordinates(body, jd);
  return {
    x: helio.x - earth.x,
    y: helio.y - earth.y,
    z: helio.z - earth.z,
    name: body
  };
}
/**
 * Approximate geometric horizontal coordinates. Azimuth is degrees clockwise
 * from true north (east = 90); altitude is degrees above the local horizon.
 * The orbital elements are a visualization approximation, especially far from J2000.
 */
export function horizontalCoordinates(body, jd, lat, lon) {
  const geo = getGeoCoordinates(body, jd);
  const obl = 23.4393 * DEG;
  const xeq = geo.x;
  const yeq = geo.y * Math.cos(obl) - geo.z * Math.sin(obl);
  const zeq = geo.y * Math.sin(obl) + geo.z * Math.cos(obl);
  const ra = Math.atan2(yeq, xeq);
  const dec = Math.atan2(zeq, Math.hypot(xeq, yeq));
  const gmst = wrap360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const ha = (wrap360(gmst + lon) * DEG - ra);
  const phi = lat * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(dec) +
    Math.cos(phi) * Math.cos(dec) * Math.cos(ha);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
  const east = -Math.sin(ha) * Math.cos(dec);
  const north = Math.sin(dec) * Math.cos(phi) -
    Math.cos(dec) * Math.sin(phi) * Math.cos(ha);
  const azimuth = wrap360(Math.atan2(east, north) * RAD);
  return { altitude, azimuth };
}
export function altitudeAboveHorizon(body, jd, lat, lon) {
  return horizontalCoordinates(body, jd, lat, lon).altitude;
}
export { PLANET_COLORS, ELEMENTS };
export class EphemerisEngine {
  dateToJulianDay(...args) {
    return dateToJulianDay(...args);
  }
  jdToCalendar(jd) {
    return jdToCalendar(jd);
  }
  yearFromJd(jd) {
    return yearFromJd(jd);
  }
  getHelioCoordinates(body, jd) {
    return getHelioCoordinates(body, jd);
  }
  getGeoCoordinates(body, jd) {
    return getGeoCoordinates(body, jd);
  }
  getAllBodies(jd) {
    return getAllBodies(jd);
  }
  altitudeAboveHorizon(body, jd, lat, lon) {
    return altitudeAboveHorizon(body, jd, lat, lon);
  }
  horizontalCoordinates(body, jd, lat, lon) {
    return horizontalCoordinates(body, jd, lat, lon);
  }
}
export default EphemerisEngine;
