// Planets built from one template: a sphere with a generated surface
// (noise + bands + caps), a bump map from the same noise, an atmosphere rim,
// rings where they belong, and each planet's real pole direction and spin.
// No image files, so nothing to download or break.
import * as THREE from 'three';
import { raDecToScene } from './cosmos.js';

// Small seeded value noise, summed over octaves (fbm) and wrapped in longitude
function makeNoise(seed) {
  const P = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const base = [...Array(256).keys()].sort(() => rnd() - 0.5);
  for (let i = 0; i < 512; i++) P[i] = base[i & 255];
  const grad = (h, x, y, z) => {
    const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function n3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lerp(lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u),
      lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
      lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u),
        lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  }
  return (x, y, z, oct = 5) => {
    let a = 0, f = 1, amp = 1, norm = 0;
    for (let o = 0; o < oct; o++) { a += amp * n3(x * f, y * f, z * f); norm += amp; amp *= 0.5; f *= 2; }
    return a / norm;
  };
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

// Surface recipes. Each returns [r,g,b] and a height (0..1) for a point on the
// unit sphere (x, y, z with y = the planet's pole) and latitude.
const RECIPES = {
  rocky(n, cA, cB) {
    return (x, y, z) => {
      const h = n(x * 3, y * 3, z * 3, 6) * 0.5 + 0.5;
      const crater = Math.pow(Math.abs(n(x * 9 + 7, y * 9, z * 9, 3)), 3) * 4;
      return [mix(hex(cA), hex(cB), h), Math.max(0, h - crater * 0.3)];
    };
  },
  earth(n, land) {
    return (x, y, z, lat, lon) => {
      const h = n(x * 1.6, y * 1.6, z * 1.6, 6);
      const isLand = land ? land(lon, lat) : h >= 0.04;
      const ice = Math.abs(lat) > (isLand ? 62 : 72) + n(x * 4, y * 4, z * 4, 3) * 10;
      if (ice) return [[235, 240, 245], isLand ? 0.7 : 0.1];
      if (!isLand) return [mix([8, 26, 70], [22, 64, 125], Math.min(1, (h + 0.6) / 1.2)), 0];
      const dry = Math.abs(Math.abs(lat) - 25) < 12 ? 1 : 0;
      return [mix(mix([50, 105, 45], [120, 110, 70], h * 2), [190, 160, 110], dry * 0.6), 0.3 + h];
    };
  },
  mars(n) {
    return (x, y, z, lat) => {
      const h = n(x * 2.5, y * 2.5, z * 2.5, 6) * 0.5 + 0.5;
      if (Math.abs(lat) > 78 + n(x * 5, y * 5, z * 5, 2) * 8) return [[240, 235, 230], 0.5];
      return [mix([110, 45, 25], [205, 110, 65], h), h];
    };
  },
  venus(n) {
    return (x, y, z, lat) => {
      const w = n(x * 2 + lat * 0.03, y * 5, z * 2, 5) * 0.5 + 0.5;
      return [mix([200, 165, 110], [245, 225, 180], w), 0.3];
    };
  },
  bands(n, colors, storm) {
    const cs = colors.map(hex);
    return (x, y, z, lat) => {
      const turb = n(x * 3, y * 12, z * 3, 4) * 0.35;
      const b = (Math.sin((lat / 90) * Math.PI * 7 + turb * 6) + 1) / 2;
      const k = Math.min(cs.length - 2, Math.floor(((lat + 90) / 180) * (cs.length - 1)));
      let c = mix(mix(cs[k], cs[k + 1], b), [255, 255, 255], Math.max(0, turb) * 0.3);
      if (storm) {
        const lon = Math.atan2(z, x) * 180 / Math.PI;
        const d = Math.hypot((lon - storm.lon) / storm.w, (lat - storm.lat) / storm.h);
        if (d < 1) c = mix(c, hex(storm.color), (1 - d) * 0.9);
      }
      return [c, 0.2 + b * 0.1];
    };
  },
};

function paint(recipe, seed, w = 512, h = 256, extra) {
  const n = makeNoise(seed);
  const f = recipe(n, extra);
  const can = document.createElement('canvas'), bump = document.createElement('canvas');
  can.width = bump.width = w; can.height = bump.height = h;
  const ctx = can.getContext('2d'), bctx = bump.getContext('2d');
  const img = ctx.createImageData(w, h), bimg = bctx.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const lat = 90 - (j + 0.5) / h * 180, cl = Math.cos(lat * Math.PI / 180), y = Math.sin(lat * Math.PI / 180);
    for (let i = 0; i < w; i++) {
      const lon = (i + 0.5) / w * Math.PI * 2;
      const [c, height] = f(cl * Math.cos(lon), y, cl * Math.sin(lon), lat, (i + 0.5) / w * 360 - 180);
      const o = (j * w + i) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      const g = Math.max(0, Math.min(255, height * 255));
      bimg.data[o] = bimg.data[o + 1] = bimg.data[o + 2] = g; bimg.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  const map = new THREE.CanvasTexture(can), bumpMap = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bumpMap };
}

// Pole directions (IAU, J2000 RA/Dec), rotation periods (hours, negative =
// backwards) and looks. Uranus lies on its side; Venus and Uranus spin backwards.
export const PLANET_LOOKS = {
  Mercury: { pole: [281.01, 61.45], day: 1407.6, recipe: n => RECIPES.rocky(n, 0x4a4540, 0xb5aea5) },
  Venus:   { pole: [272.76, 67.16], day: -5832.5, recipe: RECIPES.venus, atmo: 0xffe2a8 },
  Earth:   { pole: [0, 90], day: 23.934, recipe: RECIPES.earth, atmo: 0x5fb8ff },
  Mars:    { pole: [317.68, 52.89], day: 24.623, recipe: RECIPES.mars, atmo: 0xff9a6a },
  Jupiter: { pole: [268.06, 64.50], day: 9.925, atmo: 0xe8c89a,
    recipe: n => RECIPES.bands(n, [0x9c8a70, 0xe8dcc0, 0xb07a50, 0xf0e6d0, 0xc08a5a, 0xe8dcc0, 0x9c8a70],
      { lat: -22, lon: 40, w: 14, h: 6, color: 0xc0583a }) },
  Saturn:  { pole: [40.59, 83.54], day: 10.656, atmo: 0xf0dca0,
    recipe: n => RECIPES.bands(n, [0xb8a070, 0xe8d8a8, 0xd0b880, 0xf0e2b8, 0xd0b880, 0xe8d8a8, 0xb8a070]),
    ring: { inner: 1.24, outer: 2.27, color: [215, 195, 150] } },
  Uranus:  { pole: [257.31, -15.18], day: -17.24, atmo: 0xa8f0f0,
    recipe: n => RECIPES.bands(n, [0x9ed8dc, 0xb8eef0, 0xa8e4e8, 0xb8eef0, 0x9ed8dc]),
    ring: { inner: 1.6, outer: 2.0, color: [160, 170, 175], faint: true } },
  Neptune: { pole: [299.36, 43.46], day: 16.11, atmo: 0x6f8cff,
    recipe: n => RECIPES.bands(n, [0x2c4aa8, 0x4068d0, 0x3558bc, 0x4a74dc, 0x2c4aa8],
      { lat: -20, lon: -60, w: 10, h: 5, color: 0x1a2a6a }) },
  Pluto:   { pole: [132.99, -6.16], day: -153.3, recipe: n => RECIPES.rocky(n, 0x6a5040, 0xe8d8c0) },
  Moon:    { pole: [269.99, 66.54], day: 655.7, recipe: n => RECIPES.rocky(n, 0x55524e, 0xc8c4bc) },
};

const ATMO_VERT = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal);
vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const ATMO_FRAG = `uniform vec3 color; uniform vec3 sunDir; varying vec3 vN; varying vec3 vV;
void main(){ float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
float lit = smoothstep(-0.25, 0.4, dot(vN, sunDir)); gl_FragColor = vec4(color, rim * lit * 1.3); }`;

function ringMesh(r, radius) {
  const geo = new THREE.RingGeometry(radius * r.inner, radius * r.outer, 128, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    uv.setXY(k, (v.length() / radius - r.inner) / (r.outer - r.inner), 0.5);
  }
  const can = document.createElement('canvas');
  can.width = 512; can.height = 1;
  const ctx = can.getContext('2d'), img = ctx.createImageData(512, 1), n = makeNoise(11);
  for (let i = 0; i < 512; i++) {
    const t = i / 511;
    let a = r.faint ? 0.25 : 0.55 + 0.35 * n(t * 40, 0, 0, 3);
    if (!r.faint && t > 0.53 && t < 0.58) a *= 0.12;           // Cassini Division
    if (t < 0.03 || t > 0.97) a *= 0.3;
    img.data.set([r.color[0], r.color[1], r.color[2], Math.max(0, Math.min(255, a * 255))], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(can);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;   // into the planet's equatorial plane (local XZ)
  return m;
}

// Real coastlines (Natural Earth 110m) rasterised to a lookup, so the Earth
// in Space shows the same continents as the globe and street map.
export async function loadLandMask(topojson) {
  const topo = await fetch('/vendor/world-atlas/land-110m.json').then(r => r.json());
  const land = topojson.feature(topo, topo.objects.land);
  const W = 1024, H = 512, can = document.createElement('canvas');
  can.width = W; can.height = H;
  const ctx = can.getContext('2d');
  ctx.fillStyle = '#fff';
  land.features.forEach(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polys.forEach(poly => {
      // Unwrap longitudes so rings crossing the 180° line stay continuous,
      // then draw each polygon three times (shifted a full turn either way).
      const rings = poly.map(ring => {
        let prev = null, off = 0;
        return ring.map(([lo, la]) => {
          if (prev !== null && lo + off - prev > 180) off -= 360;
          else if (prev !== null && lo + off - prev < -180) off += 360;
          prev = lo + off;
          return [prev, la];
        });
      });
      [-360, 0, 360].forEach(shift => {
        ctx.beginPath();
        rings.forEach(ring => ring.forEach(([lo, la], k) => {
          const px = (lo + shift + 180) / 360 * W, py = (90 - la) / 180 * H;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }));
        ctx.fill('evenodd');
      });
    });
  });
  ctx.fillRect(0, H * (1 - 6 / 180), W, H);            // Antarctica's interior
  const px = ctx.getImageData(0, 0, W, H).data;
  return (lon, lat) => {
    const i = Math.min(W - 1, Math.floor((lon + 180) / 360 * W)), j = Math.min(H - 1, Math.floor((90 - lat) / 180 * H));
    return px[(j * W + i) * 4] > 127;
  };
}

export function makePlanet(name, radius, seed = 1, extra) {
  const look = PLANET_LOOKS[name];
  const outer = new THREE.Group();          // positioned in orbit
  const tilt = new THREE.Group();           // pole pointing the real way
  const spin = new THREE.Group();           // turns once per day
  outer.add(tilt); tilt.add(spin);
  tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), raDecToScene(...look.pole));

  const { map, bumpMap } = paint(look.recipe, seed, extra ? 1024 : 512, extra ? 512 : 256, extra);
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48),
    new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 1.2, roughness: 0.95, metalness: 0 }));
  spin.add(body);

  let atmo = null;
  if (look.atmo) {
    atmo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 48, 32), new THREE.ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.FrontSide,
      uniforms: { color: { value: new THREE.Color(look.atmo) }, sunDir: { value: new THREE.Vector3(1, 0, 0) } } }));
    outer.add(atmo);
  }
  if (look.ring) tilt.add(ringMesh(look.ring, radius));

  return {
    group: outer, body, look, tilt, spin,
    // hours since J2000 -> spin angle; sun direction for the atmosphere glow
    update(date, sunDirFromPlanet) {
      const hours = (date.getTime() - 946728000000) / 3.6e6;
      spin.rotation.y = (hours / look.day) * Math.PI * 2;
      if (atmo) atmo.material.uniforms.sunDir.value.copy(sunDirFromPlanet);
    },
  };
}
