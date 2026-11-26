import * as Astronomy from "astronomy-engine";

export const AU_KM = 149597870.7;
export const RE_KM = 6371.0;
export const RM_KM = 1737.4;
export const RS_KM = 695700.0;
export const OBLIQUITY = 23.4392911;

export type Vec3 = { x: number; y: number; z: number };

const STAGE = 7.15;

export function logCompress(v: Vec3): Vec3 & { r: number } {
  const r = Math.hypot(v.x, v.y, v.z);
  if (r < 1e-8) return { x: 0, y: 0, z: 0, r: 0 };
  const R = Math.log10(r * 8 + 1) * STAGE;
  const s = R / r;
  return { x: v.x * s, y: v.y * s, z: v.z * s, r: R };
}

/** Ecliptic heliocentric, scene frame: XZ ecliptic, Y north. AU. */
export function helioScene(body: Astronomy.Body, date: Date): Vec3 {
  const eq = Astronomy.HelioVector(body, date);
  const ecl = Astronomy.Ecliptic(eq);
  return { x: ecl.vec.x, y: ecl.vec.z, z: ecl.vec.y };
}

export function helioDisplay(body: Astronomy.Body, date: Date) {
  return logCompress(helioScene(body, date));
}

export function geoSceneAU(body: Astronomy.Body, date: Date): Vec3 {
  const eq = Astronomy.GeoVector(body, date, false);
  const ecl = Astronomy.Ecliptic(eq);
  return { x: ecl.vec.x, y: ecl.vec.z, z: ecl.vec.y };
}

export function sunEclipticLon(date: Date): number {
  const v = Astronomy.GeoVector(Astronomy.Body.Sun, date, false);
  let lon = Astronomy.Ecliptic(v).elon;
  if (lon < 0) lon += 360;
  return lon;
}

export function bodyEclipticLon(body: Astronomy.Body, date: Date): number {
  const v = Astronomy.GeoVector(body, date, false);
  let lon = Astronomy.Ecliptic(v).elon;
  if (lon < 0) lon += 360;
  return lon;
}

export function horizontal(
  body: Astronomy.Body,
  date: Date,
  lat: number,
  lon: number,
): { altitude: number; azimuth: number } {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const eq = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal");
  return { altitude: hor.altitude, azimuth: hor.azimuth };
}

const TAU = Math.PI * 2;

function rotZ(v: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: c * v.x + s * v.y, y: -s * v.x + c * v.y, z: v.z };
}

/** EQJ vector (AU) → Earth-fixed km. +X lon 0, +Y north, +Z lon 90°. */
export function eqjToEcefKm(v: Vec3, date: Date): Vec3 {
  const gst = Astronomy.SiderealTime(date) * 15 * (Math.PI / 180);
  const r = rotZ(v, gst);
  return { x: r.x * AU_KM, y: r.z * AU_KM, z: r.y * AU_KM };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function norm(a: Vec3): Vec3 {
  const L = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / L, y: a.y / L, z: a.z / L };
}
function latLonOf(p: Vec3) {
  const r = Math.hypot(p.x, p.y, p.z) || 1;
  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, p.y / r))) * 180) / Math.PI,
    lon: (Math.atan2(p.z, p.x) * 180) / Math.PI,
  };
}

export type Shadow = {
  hits: boolean;
  lat: number;
  lon: number;
  /** km; negative means the umbra ended before the surface (annular / antumbra). */
  umbraKm: number;
  penumbraKm: number;
  moonRe: number;
  kind: "total" | "annular" | "partial" | "none";
  axis: Vec3;
};

/**
 * Moon's shadow axis against a spherical Earth.
 * Umbra/penumbra radii are the geometric cross-section at the surface.
 */
export function moonShadow(date: Date): Shadow {
  const moonEq = Astronomy.GeoVector(Astronomy.Body.Moon, date, false);
  const sunEq = Astronomy.GeoVector(Astronomy.Body.Sun, date, false);
  const moon = eqjToEcefKm(moonEq, date);
  const sun = eqjToEcefKm(sunEq, date);
  const dir = norm(sub(moon, sun));
  const md = dot(moon, dir);
  const m2 = dot(moon, moon);
  const disc = md * md - (m2 - RE_KM * RE_KM);
  const moonRe = Math.hypot(moon.x, moon.y, moon.z) / RE_KM;
  const Dsm = Math.hypot(sun.x - moon.x, sun.y - moon.y, sun.z - moon.z);
  const t0 = -md;
  const closest = { x: moon.x + dir.x * t0, y: moon.y + dir.y * t0, z: moon.z + dir.z * t0 };
  const impact = Math.hypot(closest.x, closest.y, closest.z);
  const dSurf = Math.max(0, Math.hypot(moon.x, moon.y, moon.z) - RE_KM);
  const umbraAt = RM_KM - (dSurf * (RS_KM - RM_KM)) / Dsm;
  const penAt = RM_KM + (dSurf * (RS_KM + RM_KM)) / Dsm;
  if (disc <= 0) {
    const geo = latLonOf(closest);
    const touches = impact < RE_KM + Math.max(penAt, 0);
    return {
      hits: touches,
      lat: geo.lat,
      lon: geo.lon,
      umbraKm: -1,
      penumbraKm: touches ? Math.max(0, RE_KM + penAt - impact) : 0,
      moonRe,
      kind: touches ? "partial" : "none",
      axis: norm(closest),
    };
  }
  const sqrt = Math.sqrt(disc);
  const tNear = -md - sqrt;
  const tFar = -md + sqrt;
  const t = tNear > 0 ? tNear : tFar;
  const hit = { x: moon.x + dir.x * t, y: moon.y + dir.y * t, z: moon.z + dir.z * t };
  const d = Math.abs(t);
  const umbraKm = RM_KM - (d * (RS_KM - RM_KM)) / Dsm;
  const penumbraKm = RM_KM + (d * (RS_KM + RM_KM)) / Dsm;
  const geo = latLonOf(hit);
  let kind: Shadow["kind"] = "partial";
  if (umbraKm > 0) kind = "total";
  else if (umbraKm < 0 && penumbraKm > Math.abs(umbraKm)) kind = "annular";
  return {
    hits: true,
    lat: geo.lat,
    lon: geo.lon,
    umbraKm,
    penumbraKm,
    moonRe,
    kind,
    axis: norm(hit),
  };
}

export function ecefUnit(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cl = Math.cos(lat);
  return { x: cl * Math.cos(lon), y: Math.sin(lat), z: cl * Math.sin(lon) };
}

/** Hyperbolic ʻOumuamua, JPL-like elements, ecliptic scene AU. */
export function oumuamuaScene(date: Date): Vec3 | null {
  const q = 0.255916;
  const e = 1.20113;
  const a = q / (e - 1);
  const i = (122.7417 * Math.PI) / 180;
  const Om = (24.5969 * Math.PI) / 180;
  const w = (241.8106 * Math.PI) / 180;
  const tp = Date.UTC(2017, 8, 9, 12, 0, 0);
  const dt = (date.getTime() - tp) / 86400000;
  const k = 0.01720209895;
  const n = k / Math.pow(a, 1.5);
  const M = n * dt;
  let H = Math.asinh(M / Math.max(e, 1.01));
  for (let s = 0; s < 16; s++) {
    const f = e * Math.sinh(H) - H - M;
    const fp = e * Math.cosh(H) - 1;
    H -= f / fp;
  }
  const r = a * (e * Math.cosh(H) - 1);
  if (!Number.isFinite(r) || r > 80) return null;
  const nu = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
  const xp = r * Math.cos(nu);
  const yp = r * Math.sin(nu);
  const cO = Math.cos(Om);
  const sO = Math.sin(Om);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const x = (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp;
  const yEcl = (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp;
  const zEcl = sw * si * xp + cw * si * yp;
  return { x, y: zEcl, z: yEcl };
}

/** Hypothetical Planet Nine — inclined, currently near aphelion. Not a detection. */
export function planetNineScene(date: Date): Vec3 {
  const a = 500;
  const e = 0.25;
  const i = (20 * Math.PI) / 180;
  const Om = (97 * Math.PI) / 180;
  const w = (150 * Math.PI) / 180;
  const M0 = Math.PI;
  const n = (2 * Math.PI) / (a ** 1.5 * 365.25);
  const epoch = Date.UTC(2000, 0, 1, 12);
  const dt = (date.getTime() - epoch) / 86400000;
  let M = M0 + n * dt;
  M = ((M % TAU) + TAU) % TAU;
  let E = M;
  for (let s = 0; s < 12; s++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const nu = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const cO = Math.cos(Om);
  const sO = Math.sin(Om);
  const cw = Math.cos(w + nu);
  const sw = Math.sin(w + nu);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const x = r * (cO * cw - sO * sw * ci);
  const yEcl = r * (sO * cw + cO * sw * ci);
  const zEcl = r * sw * si;
  return { x, y: zEcl, z: yEcl };
}

export function formatWhen(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const p = (n: number) => String(n).padStart(2, "0");
  const label = y > 0 ? `${y} CE` : y === 0 ? "1 BCE" : `${1 - y} BCE`;
  return `${label}  ${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}  ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function civilYear(ms: number) {
  return new Date(ms).getUTCFullYear();
}

export const EURO_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export const EURO_GLYPH = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export const CN_ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"] as const;
export const CN_GLYPH = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

export function euroSignIndex(date: Date) {
  return Math.floor(sunEclipticLon(date) / 30) % 12;
}

/** Gregorian-year animal. The Chinese New Year boundary falls in late January or February. */
export function chineseIndex(year: number) {
  const y = year <= 0 ? year + 1 : year;
  return ((y - 4) % 12 + 12) % 12;
}
