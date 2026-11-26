// The Moon, the Sun as seen from Earth, and the clock correction between them.
//
// Moon: J. Meeus, Astronomical Algorithms (2nd ed.), chapter 47, the main
// terms of the ELP-2000/82 series (tables 47.A and 47.B, terms down to about
// 0.0003 degrees). Sun: Meeus chapter 25, low-accuracy method (about 0.01 deg).
// Delta T: Morrison & Stephenson (2004) parabola, -20 + 32 u^2 seconds.
//
// Angles from moonOfDate/sunLongitudeOfDate are referred to the mean equinox
// of date. moonGeocentric() rotates the Moon to the J2000 ecliptic used by
// elements.js, so it can be added to Earth's heliocentric position.

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const sin = (d) => Math.sin(d * DEG);
const cos = (d) => Math.cos(d * DEG);
const wrap360 = (d) => ((d % 360) + 360) % 360;

// Mass ratio Moon / (Earth + Moon): how far Earth sits from the barycentre.
export const MOON_MASS_FRACTION = 0.0121505856;

// Seconds. Earth's spin has slowed; TT runs ahead of UT by this much.
export function deltaT(jdUT) {
  const year = 2000 + (jdUT - 2451545.0) / 365.25;
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

export function utToTT(jdUT) {
  return jdUT + deltaT(jdUT) / 86400;
}

// [D, M, M', F, longitude coefficient (1e-6 deg), distance coefficient (1e-3 km)]
const LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884], [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0], [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958], [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258], [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354], [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0], [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739], [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421], [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0], [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0], [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752]
];

// [D, M, M', F, latitude coefficient (1e-6 deg)]
const B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833]
];

// Geometric Moon, mean equinox of date: { lon, lat } in degrees, dist in km.
export function moonOfDate(jdUT) {
  const T = (utToTT(jdUT) - 2451545.0) / 36525;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const eFac = (m) => (Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1);

  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, cl, cr] of LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const k = eFac(m);
    sl += cl * k * sin(arg);
    sr += cr * k * cos(arg);
  }
  for (const [d, m, mp, f, cb] of B) {
    sb += cb * eFac(m) * sin(d * D + m * M + mp * Mp + f * F);
  }
  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) +
    127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);

  return { lon: wrap360(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
}

// Geometric Sun longitude, mean equinox of date, degrees; distance in AU.
export function sunOfDate(jdUT) {
  const T = (utToTT(jdUT) - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const nu = M + C;
  return { lon: wrap360(L0 + C), dist: (1.000001018 * (1 - e * e)) / (1 + e * cos(nu)) };
}

// Moon relative to Earth's centre, J2000 ecliptic, AU.
// Precession in longitude since J2000 is removed so the vector matches
// elements.js; the small change in the ecliptic's tilt is ignored.
export function moonGeocentric(jdUT) {
  const m = moonOfDate(jdUT);
  const T = (utToTT(jdUT) - 2451545.0) / 36525;
  const lon = m.lon - (5029.0966 * T) / 3600;
  const r = m.dist / AU_KM;
  return {
    x: r * cos(m.lat) * cos(lon),
    y: r * cos(m.lat) * sin(lon),
    z: r * sin(m.lat)
  };
}

// Angular separation in degrees between two (lon, lat) directions.
function separation(lon1, lat1, lon2, lat2) {
  const c = sin(lat1) * sin(lat2) + cos(lat1) * cos(lat2) * cos(lon1 - lon2);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

// Geometry at an instant, seen from Earth's centre.
// solarSep: Moon to Sun centre. lunarSep: Moon to the centre of Earth's
// shadow. parallax: the Moon's horizontal parallax, which is one Earth radius
// at the Moon's distance; NASA's gamma is separation / parallax, near enough.
export function eclipseGeometry(jdUT) {
  const m = moonOfDate(jdUT);
  const s = sunOfDate(jdUT);
  const parallax = Math.asin(6378.137 / m.dist) / DEG;
  return {
    moon: m,
    sun: s,
    parallax,
    solarSep: separation(m.lon, m.lat, s.lon, 0),
    lunarSep: separation(m.lon, m.lat, s.lon + 180, 0),
    phaseAngle: wrap360(m.lon - s.lon) // 0 new, 180 full
  };
}

// Whether an eclipse of the given kind is possible at jdUT. Limits are the
// widest geocentric separations at which any partial phase can occur:
// solar 1.58 deg (Moon + Sun radii + parallax), lunar 1.6 deg (penumbra).
export function eclipseAt(jdUT, kind) {
  const g = eclipseGeometry(jdUT);
  if (kind === 'solar') return { ...g, ok: g.solarSep < 1.58, sep: g.solarSep };
  return { ...g, ok: g.lunarSep < 1.6, sep: g.lunarSep };
}

// Earth's centre from the Sun, J2000 ecliptic, AU, from the chapter-25 Sun.
// Used outside 1800-2050, where JPL Table 1 drifts (0.7 deg by 1375 BCE)
// and this holds to about 0.01 deg.
export function earthFromSun(jdUT) {
  const s = sunOfDate(jdUT);
  const T = (utToTT(jdUT) - 2451545.0) / 36525;
  const lon = s.lon + 180 - (5029.0966 * T) / 3600;
  return { x: s.dist * cos(lon), y: s.dist * sin(lon), z: 0 };
}
