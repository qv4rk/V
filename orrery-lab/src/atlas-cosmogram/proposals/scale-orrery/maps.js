// Surface maps for the orrery bodies.
//
// The Scale Orrery loaded five URLs. On 2026-10-02 the Mercury and Venus links
// returned 404, Mars returned 429 (Wikimedia rate limit on hotlinks), and the
// Jupiter link is a 42 KB photo of the disc, not an equirectangular map.
// Only the Earth map (three-globe) loaded, and the atlas already has it.
//
// So: Earth and the Moon come from the atlas catalog. Every other body first tries a local
// file in atlas-cosmogram/assets/planet-maps/ and, until one is there, draws a
// plain generated map in the atlas colour for that body. A generated map makes
// no claim about the surface, which a retinted Earth would.

import * as THREE from 'three';
import { MAPS } from '../../js/textures.js';
import { PLANET_COLORS } from '../../js/ephemeris.js';

const ASSET_DIR = new URL('../../assets/planet-maps/', import.meta.url);

// Expected file names for maps dropped in by hand (see README).
export const LOCAL_MAP = {
  sun: '2k_sun.jpg',
  mercury: '2k_mercury.jpg',
  venus: '2k_venus_atmosphere.jpg',
  mars: '2k_mars.jpg',
  jupiter: '2k_jupiter.jpg',
  saturn: '2k_saturn.jpg',
  uranus: '2k_uranus.jpg',
  neptune: '2k_neptune.jpg',
  io: 'io.jpg',
  europa: 'europa.jpg',
  ganymede: 'ganymede.jpg',
  callisto: 'callisto.jpg'
};

const BANDED = new Set(['jupiter', 'saturn', 'uranus', 'neptune']);

// Galilean moons have no atlas colour; these follow their overall albedo tint.
const MOON_COLORS = { io: 0xd8c25a, europa: 0xcbbfa8, ganymede: 0x8f8574, callisto: 0x5e564c };

// Small seeded noise so the generated maps are the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generatedMap(body) {
  const w = 512, h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(PLANET_COLORS[body] ?? MOON_COLORS[body] ?? 0x999999);
  const rand = rng([...body].reduce((n, c) => n * 31 + c.charCodeAt(0), 7));
  const shade = (k) => {
    const c = base.clone().multiplyScalar(k);
    return `rgb(${Math.round(Math.min(1, c.r) * 255)},${Math.round(Math.min(1, c.g) * 255)},${Math.round(Math.min(1, c.b) * 255)})`;
  };
  ctx.fillStyle = shade(1);
  ctx.fillRect(0, 0, w, h);
  if (BANDED.has(body)) {
    // Latitude bands, stronger for Jupiter and Saturn than for the ice giants.
    const depth = body === 'jupiter' || body === 'saturn' ? 0.22 : 0.06;
    for (let y = 0; y < h; y++) {
      const lat = (y / h) * Math.PI;
      const k = 1 + depth * Math.sin(lat * 9 + rand() * 0.4) * Math.sin(lat);
      ctx.fillStyle = shade(k);
      ctx.fillRect(0, y, w, 1);
    }
  } else {
    // Mottling for rocky bodies and the Sun.
    const spots = body === 'sun' ? 900 : 600;
    for (let i = 0; i < spots; i++) {
      ctx.fillStyle = shade(0.8 + rand() * 0.35);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 2 + rand() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Radial alpha bands for Saturn's ring, drawn for RingGeometry's planar UVs.
export function saturnRingMap(innerFrac) {
  const n = 512;
  const canvas = document.createElement('canvas');
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext('2d');
  const rand = rng(6);
  const r0 = (n / 2) * innerFrac;
  for (let r = n / 2; r > r0; r -= 1) {
    const t = (r - r0) / (n / 2 - r0);
    // Cassini division near 0.6 of the way out.
    const gap = Math.abs(t - 0.6) < 0.025 ? 0.08 : 1;
    const a = (0.35 + 0.45 * rand()) * gap * (t < 0.2 ? 0.4 : 1);
    ctx.fillStyle = `rgba(226,208,170,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(n / 2, n / 2, r, 0, Math.PI * 2);
    ctx.arc(n / 2, n / 2, r - 1, 0, Math.PI * 2, true);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Returns a texture now (generated) and swaps in the real file if it loads.
export function mapFor(body, material, loader = new THREE.TextureLoader()) {
  if (body === 'earth' || body === 'moon') {
    const tex = loader.load(body === 'earth' ? MAPS.earthBlueMarble : MAPS.lunarSurface);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const fallback = generatedMap(body);
  const file = LOCAL_MAP[body];
  if (file && material) {
    loader.load(
      new URL(file, ASSET_DIR).href,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        material.map = tex;
        material.needsUpdate = true;
        fallback.dispose();
      },
      undefined,
      () => {} // missing file: keep the generated map
    );
  }
  return fallback;
}
