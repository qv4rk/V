import * as THREE from "three";
import { feature } from "topojson-client";
import landTopoRaw from "@/data/land-110m.json";

const landTopo = unwrapTopo(landTopoRaw);

function unwrapTopo(raw: unknown): { objects: { land: object } } {
  const obj = raw as { objects?: { land?: object }; default?: { objects?: { land?: object } } };
  const topo = obj?.objects?.land ? obj : obj?.default;
  if (!topo?.objects?.land) throw new Error("land topology failed to load");
  return topo as { objects: { land: object } };
}


function canvasTex(w: number, h: number, paint: (img: ImageData, w: number, h: number) => void) {
  const can = document.createElement("canvas");
  can.width = w;
  can.height = h;
  const ctx = can.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const img = ctx.createImageData(w, h);
  paint(img, w, h);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(can);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = hash(x0 + y0 * 57);
  const b = hash(x0 + 1 + y0 * 57);
  const c = hash(x0 + (y0 + 1) * 57);
  const d = hash(x0 + 1 + (y0 + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number) {
  let a = 0;
  let f = 1;
  let amp = 1;
  let n = 0;
  for (let i = 0; i < 5; i++) {
    a += amp * noise(x * f, y * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return a / n;
}

function mix(a: number[], b: number[], t: number) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

export function makeRockyTexture(seed: number, cA: number[], cB: number[]) {
  return canvasTex(256, 128, (img, w, h) => {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const u = i / w;
        const v = j / h;
        const n = fbm(u * 6 + seed, v * 3 + seed);
        const c = mix(cA, cB, n);
        const o = (j * w + i) * 4;
        img.data[o] = c[0];
        img.data[o + 1] = c[1];
        img.data[o + 2] = c[2];
        img.data[o + 3] = 255;
      }
    }
  });
}

export function makeBandTexture(colors: number[][], seed = 1) {
  return canvasTex(256, 128, (img, w, h) => {
    for (let j = 0; j < h; j++) {
      const lat = 90 - (j / h) * 180;
      for (let i = 0; i < w; i++) {
        const turb = fbm(i / w * 8 + seed, j / h * 2) - 0.5;
        const t = (Math.sin(((lat / 90) * Math.PI * 6) + turb * 4) + 1) / 2;
        const k = Math.min(colors.length - 2, Math.floor(((lat + 90) / 180) * (colors.length - 1)));
        const c = mix(mix(colors[k], colors[k + 1], t), [255, 250, 240], Math.max(0, turb) * 0.25);
        const o = (j * w + i) * 4;
        img.data[o] = c[0];
        img.data[o + 1] = c[1];
        img.data[o + 2] = c[2];
        img.data[o + 3] = 255;
      }
    }
  });
}

type Ring = number[][][];

function drawLand(ctx: CanvasRenderingContext2D, rings: Ring, W: number, H: number, shift: number) {
  ctx.beginPath();
  for (const ring of rings) {
    ring.forEach(([lo, la], k) => {
      const px = ((lo + shift + 180) / 360) * W;
      const py = ((90 - la) / 180) * H;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
  }
  ctx.fill("evenodd");
}

type LandGeom = { type: string; coordinates: number[][][] | number[][][][] };

function collectLandPolys(geom: LandGeom, polys: number[][][][]) {
  if (geom.type === "Polygon") polys.push(geom.coordinates as number[][][]);
  else if (geom.type === "MultiPolygon") polys.push(...(geom.coordinates as number[][][][]));
}

/** Natural Earth 110m land, same lat/lon frame the eclipse shader samples. */
export function makeEarthTexture() {
  // world-atlas land is a GeometryCollection, so topojson feature() returns a FeatureCollection.
  const feat = feature(landTopo as never, landTopo.objects.land as never) as unknown as {
    type: string;
    geometry?: LandGeom;
    features?: { geometry: LandGeom }[];
  };
  const polys: number[][][][] = [];
  if (feat.type === "FeatureCollection" && feat.features) {
    for (const item of feat.features) collectLandPolys(item.geometry, polys);
  } else if (feat.geometry) {
    collectLandPolys(feat.geometry, polys);
  } else {
    throw new Error("land geometry missing");
  }

  const W = 1024;
  const H = 512;
  const can = document.createElement("canvas");
  can.width = W;
  can.height = H;
  const ctx = can.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#12305f");
  sky.addColorStop(0.5, "#1a4e86");
  sky.addColorStop(1, "#12305f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6d8f52";
  for (const poly of polys) {
    const rings = poly.map((ring) => {
      let prev: number | null = null;
      let off = 0;
      return ring.map(([lo, la]) => {
        if (prev !== null && lo + off - prev > 180) off -= 360;
        else if (prev !== null && lo + off - prev < -180) off += 360;
        prev = lo + off;
        return [prev, la] as [number, number];
      });
    });
    for (const shift of [-360, 0, 360]) drawLand(ctx, rings, W, H, shift);
  }
  ctx.fillStyle = "#e7eef2";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 18, W, 18);
  const tex = new THREE.CanvasTexture(can);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const EARTH_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const EARTH_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uUmbra;
uniform vec3 uSun;
uniform float uUmbraAng;
uniform float uPenAng;
uniform float uCore;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(n.z, n.x);
  vec2 uv = vec2(lon / 6.2831853 + 0.5, 0.5 + lat / 3.14159265);
  vec3 albedo = texture2D(uMap, uv).rgb;
  float day = smoothstep(-0.12, 0.35, dot(n, normalize(uSun)));
  float ang = acos(clamp(dot(n, normalize(uUmbra)), -1.0, 1.0));
  float pen = 1.0 - smoothstep(uUmbraAng, max(uPenAng, uUmbraAng + 0.001), ang);
  float core = uCore * (1.0 - smoothstep(uUmbraAng * 0.55, uUmbraAng, ang));
  float shade = 1.0 - pen * 0.78 - core * 0.2;
  vec3 col = albedo * (0.045 + 0.955 * day) * shade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const WELL_VERT = /* glsl */ `
uniform vec4 uBody[12];
varying float vShade;
float well(vec4 b) {
  vec2 d = position.xz - b.xz;
  return b.w / (length(d) + 0.28);
}
void main() {
  float pot = well(uBody[0]) + well(uBody[1]) + well(uBody[2]) + well(uBody[3])
    + well(uBody[4]) + well(uBody[5]) + well(uBody[6]) + well(uBody[7])
    + well(uBody[8]) + well(uBody[9]) + well(uBody[10]) + well(uBody[11]);
  float h = -log(1.0 + pot) * 0.42;
  vec3 p = position;
  p.y += h;
  vShade = clamp(-h / 1.4, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const WELL_FRAG = /* glsl */ `
varying float vShade;
void main() {
  vec3 gold = vec3(0.788, 0.659, 0.298);
  float a = smoothstep(0.02, 0.2, vShade) * 0.55;
  gl_FragColor = vec4(gold, a * (0.25 + vShade));
}
`;
