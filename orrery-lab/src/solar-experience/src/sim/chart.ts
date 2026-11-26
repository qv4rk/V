import * as Astronomy from "astronomy-engine";
import { OBLIQUITY, type Vec3 } from "@/sim/astro";

export const CHART_BODIES: { id: string; label: string; body: Astronomy.Body }[] = [
  { id: "sun", label: "Sun", body: Astronomy.Body.Sun },
  { id: "moon", label: "Moon", body: Astronomy.Body.Moon },
  { id: "mercury", label: "Mercury", body: Astronomy.Body.Mercury },
  { id: "venus", label: "Venus", body: Astronomy.Body.Venus },
  { id: "mars", label: "Mars", body: Astronomy.Body.Mars },
  { id: "jupiter", label: "Jupiter", body: Astronomy.Body.Jupiter },
  { id: "saturn", label: "Saturn", body: Astronomy.Body.Saturn },
  { id: "uranus", label: "Uranus", body: Astronomy.Body.Uranus },
  { id: "neptune", label: "Neptune", body: Astronomy.Body.Neptune },
  { id: "pluto", label: "Pluto", body: Astronomy.Body.Pluto },
];

const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 8, color: "#e4e2dc" },
  { name: "sextile", angle: 60, orb: 4.5, color: "#8aa88a" },
  { name: "square", angle: 90, orb: 6, color: "#c45c4a" },
  { name: "trine", angle: 120, orb: 6.5, color: "#c9a84c" },
  { name: "opposition", angle: 180, orb: 8, color: "#d7a0a0" },
] as const;

export type AspectHit = {
  a: string;
  b: string;
  name: string;
  delta: number;
  color: string;
};

export type ChartBody = {
  id: string;
  label: string;
  elon: number;
  altitude: number;
  azimuth: number;
};

function sep(a: number, b: number) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export function eclipticHorizon(date: Date, lat: number, lon: number, elon: number) {
  const lonR = (elon * Math.PI) / 180;
  const eps = (OBLIQUITY * Math.PI) / 180;
  const x = Math.cos(lonR);
  const y = Math.sin(lonR) * Math.cos(eps);
  const z = Math.sin(lonR) * Math.sin(eps);
  let ra = Math.atan2(y, x);
  if (ra < 0) ra += Math.PI * 2;
  const dec = Math.atan2(z, Math.hypot(x, y));
  const observer = new Astronomy.Observer(lat, lon, 0);
  return Astronomy.Horizon(date, observer, (ra * 180) / Math.PI / 15, (dec * 180) / Math.PI, "normal");
}

export function enu(lat: number, lon: number) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const sl = Math.sin(latR);
  const cl = Math.cos(latR);
  const so = Math.sin(lonR);
  const co = Math.cos(lonR);
  const east = { x: -so, y: 0, z: co };
  const north = { x: -sl * co, y: cl, z: -sl * so };
  const up = { x: cl * co, y: sl, z: cl * so };
  return { east, north, up };
}

export function add3(a: Vec3, b: Vec3, s = 1): Vec3 {
  return { x: a.x + b.x * s, y: a.y + b.y * s, z: a.z + b.z * s };
}

export function skyDir(lat: number, lon: number, altitude: number, azimuth: number): Vec3 {
  const { east, north, up } = enu(lat, lon);
  const alt = (altitude * Math.PI) / 180;
  const az = (azimuth * Math.PI) / 180;
  const e = Math.cos(alt) * Math.sin(az);
  const n = Math.cos(alt) * Math.cos(az);
  const u = Math.sin(alt);
  return {
    x: east.x * e + north.x * n + up.x * u,
    y: east.y * e + north.y * n + up.y * u,
    z: east.z * e + north.z * n + up.z * u,
  };
}

export function buildChart(date: Date, lat: number, lon: number) {
  const bodies: ChartBody[] = CHART_BODIES.map((b) => {
    const eq = Astronomy.GeoVector(b.body, date, false);
    let elon = Astronomy.Ecliptic(eq).elon;
    if (elon < 0) elon += 360;
    const observer = new Astronomy.Observer(lat, lon, 0);
    const equatorial = Astronomy.Equator(b.body, date, observer, true, true);
    const hor = Astronomy.Horizon(date, observer, equatorial.ra, equatorial.dec, "normal");
    return { id: b.id, label: b.label, elon, altitude: hor.altitude, azimuth: hor.azimuth };
  });

  const aspects: AspectHit[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const delta = sep(bodies[i].elon, bodies[j].elon);
      for (const asp of ASPECTS) {
        const off = Math.abs(delta - asp.angle);
        if (off <= asp.orb) {
          aspects.push({
            a: bodies[i].id,
            b: bodies[j].id,
            name: asp.name,
            delta: off,
            color: asp.color,
          });
          break;
        }
      }
    }
  }

  const pair = (a: string, b: string) =>
    aspects.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));

  const triangles: { ids: [string, string, string]; grand: boolean }[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      for (let k = j + 1; k < bodies.length; k++) {
        const ab = pair(bodies[i].id, bodies[j].id);
        const bc = pair(bodies[j].id, bodies[k].id);
        const ca = pair(bodies[k].id, bodies[i].id);
        if (ab && bc && ca) {
          triangles.push({
            ids: [bodies[i].id, bodies[j].id, bodies[k].id],
            grand: ab.name === "trine" && bc.name === "trine" && ca.name === "trine",
          });
        }
      }
    }
  }

  let asc = 0;
  let best = 99;
  for (let L = 0; L < 360; L += 0.5) {
    const hor = eclipticHorizon(date, lat, lon, L);
    if (hor.azimuth > 8 && hor.azimuth < 172 && Math.abs(hor.altitude) < best) {
      best = Math.abs(hor.altitude);
      asc = L;
    }
  }
  const houses = Array.from({ length: 12 }, (_, i) => (asc + i * 30) % 360);

  return { bodies, aspects, triangles, asc, houses };
}
