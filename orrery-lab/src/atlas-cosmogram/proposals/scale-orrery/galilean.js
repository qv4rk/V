// Io, Europa, Ganymede and Callisto around Jupiter.
//
// Circular orbits. Orbit planes and starting angles come from JPL Horizons
// state vectors (J2000 ecliptic, Jupiter-centred), fitted over six dates from
// 1800 to 2050; mean motions are Lieske's E5 values. Checked against Horizons
// in fixtures/horizons.json: worst error 1.3 degrees around Jupiter
// (Europa), others under 1 degree. Enough to show who is where; too coarse to
// time a transit or an eclipse of a moon.

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;

// inc, node: orbit plane against the J2000 ecliptic (deg). u0: angle from
// the ascending node at J2000 TDB (deg). n: deg/day. a: km.
export const GALILEAN = {
  io: { inc: 2.2126, node: -23.1476, u0: 41.179, n: 203.488955432, a: 421800, radiusKm: 1821.6 },
  europa: { inc: 1.791, node: -27.3713, u0: 239.829, n: 101.37472455, a: 671100, radiusKm: 1560.8 },
  ganymede: { inc: 2.2141, node: -16.8272, u0: 236.908, n: 50.31760911, a: 1070400, radiusKm: 2634.1 },
  callisto: { inc: 2.0169, node: -22.0574, u0: 101.697, n: 21.571071314, a: 1882700, radiusKm: 2410.3 }
};

// Position relative to Jupiter's centre, J2000 ecliptic, AU.
export function galileanPosition(name, jd) {
  const m = GALILEAN[name];
  const u = (m.u0 + m.n * (jd - 2451545.0)) * DEG;
  const O = m.node * DEG, i = m.inc * DEG;
  const cu = Math.cos(u), su = Math.sin(u);
  const r = m.a / AU_KM;
  return {
    x: r * (Math.cos(O) * cu - Math.sin(O) * su * Math.cos(i)),
    y: r * (Math.sin(O) * cu + Math.cos(O) * su * Math.cos(i)),
    z: r * (su * Math.sin(i))
  };
}
