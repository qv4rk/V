// Heliocentric planet positions from JPL approximate Keplerian elements.
// Source: E. M. Standish, "Keplerian Elements for Approximate Positions of the
// Major Planets", JPL Solar System Dynamics, Table 1 (valid 1800 AD - 2050 AD).
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
//
// Borrowed from The Scale Orrery: element rates per century, the Kepler solve,
// and the orbit-plane -> ecliptic rotation. Extended here to all eight planets
// with the full-precision table values.
//
// Output frame: J2000 mean ecliptic and equinox, AU. Earth is the Earth-Moon
// barycentre (about 4,700 km from Earth's centre). Time is JD; the gap between
// UT and TDB (seconds to a minute over 1800-2050) is ignored.

const DEG = Math.PI / 180;
export const J2000 = 2451545.0;
export const VALID_FROM_JD = 2378496.5; // 1800-01-01
export const VALID_TO_JD = 2470172.5; // 2050-01-01

// [value at J2000, rate per Julian century]
// a (AU), e, I (deg), L mean longitude (deg), varpi long. of perihelion (deg),
// node long. of ascending node (deg)
export const ELEMENTS = {
  mercury: {
    a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749],
    L: [252.2503235, 149472.67411175], varpi: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081]
  },
  venus: {
    a: [0.72333566, 0.0000039], e: [0.00677672, -0.00004107], I: [3.39467605, -0.0007889],
    L: [181.9790995, 58517.81538729], varpi: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418]
  },
  earth: {
    a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668],
    L: [100.46457166, 35999.37244981], varpi: [102.93768193, 0.32327364], node: [0, 0]
  },
  mars: {
    a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], I: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499], varpi: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343]
  },
  jupiter: {
    a: [5.202887, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714],
    L: [34.39644051, 3034.74612775], varpi: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106]
  },
  saturn: {
    a: [9.53667594, -0.0012506], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609],
    L: [49.95424423, 1222.49362201], varpi: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794]
  },
  uranus: {
    a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939],
    L: [313.23810451, 428.48202785], varpi: [170.9542763, 0.40805281], node: [74.01692503, 0.04240589]
  },
  neptune: {
    a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372],
    L: [-55.12002969, 218.45945325], varpi: [44.96476227, -0.32241464], node: [131.78422574, -0.00508664]
  }
};

export const PLANETS = Object.keys(ELEMENTS);

function wrap180(deg) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

export function inValidRange(jd) {
  return jd >= VALID_FROM_JD && jd <= VALID_TO_JD;
}

// Kepler's equation M = E - e sin E, Newton's method. M, E in radians.
export function solveKepler(M, e) {
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 30; k++) {
    const d = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Osculating elements at jd: { a, e, I, node, omega } (angles in degrees).
export function elementsAt(body, jd) {
  const el = ELEMENTS[body];
  if (!el) throw new Error(`No elements for ${body}`);
  const T = (jd - J2000) / 36525;
  const at = (k) => el[k][0] + el[k][1] * T;
  const varpi = at('varpi');
  const node = at('node');
  return {
    a: at('a'),
    e: at('e'),
    I: at('I'),
    node,
    omega: varpi - node,
    M: wrap180(at('L') - varpi)
  };
}

// Point on the orbit at eccentric anomaly E, rotated into the ecliptic.
function orbitToEcliptic({ a, e, I, node, omega }, E) {
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(omega * DEG), sw = Math.sin(omega * DEG);
  const cO = Math.cos(node * DEG), sO = Math.sin(node * DEG);
  const cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp
  };
}

// Heliocentric ecliptic position in AU.
export function heliocentric(body, jd) {
  if (body === 'sun') return { x: 0, y: 0, z: 0 };
  const el = elementsAt(body, jd);
  const E = solveKepler(el.M * DEG, el.e);
  return orbitToEcliptic(el, E);
}

// Position relative to the Earth-Moon barycentre, AU.
export function geocentric(body, jd) {
  const earth = heliocentric('earth', jd);
  const p = heliocentric(body, jd);
  return { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
}

// The full ellipse for jd, as `samples` ecliptic points in AU.
export function orbitPath(body, jd, samples = 256) {
  const el = elementsAt(body, jd);
  const pts = [];
  for (let k = 0; k <= samples; k++) {
    pts.push(orbitToEcliptic(el, (k / samples) * 2 * Math.PI));
  }
  return pts;
}

// Ecliptic (x toward the equinox, z toward the ecliptic north pole) to
// Three.js (y up). (x, y, z) -> (x, z, -y) is a rotation, so prograde orbits
// stay counter-clockwise when seen from +Y. Taken from The Scale Orrery.
export function eclipticToScene({ x, y, z }, scale = 1) {
  return { x: x * scale, y: z * scale, z: -y * scale };
}

// IAU pole (J2000 equatorial RA/Dec, degrees) to a unit ecliptic vector.
export function poleToEcliptic(raDeg, decDeg) {
  const eps = 23.4392911 * DEG;
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const xe = Math.cos(dec) * Math.cos(ra);
  const ye = Math.cos(dec) * Math.sin(ra);
  const ze = Math.sin(dec);
  return {
    x: xe,
    y: ye * Math.cos(eps) + ze * Math.sin(eps),
    z: -ye * Math.sin(eps) + ze * Math.cos(eps)
  };
}
