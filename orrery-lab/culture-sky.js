/** Host overlay: draw vendored Stellarium constellation lines (AGPL-3.0 source data). */
const DEG = Math.PI / 180;
const COLORS = {
  arabic: "#e8c56b",
  indian: "#7ec8a0",
  maori: "#f0a0c8",
  "stellarium-chinese": "#8fbf6a",
};

let data = null;
let cam = null;
let timeIso = new Date().toISOString();
const enabled = new Set();
const canvas = document.getElementById("culture-sky");
const ctx = canvas && canvas.getContext("2d");

function gmstRad(iso) {
  const date = iso ? new Date(iso) : new Date();
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  let deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000;
  deg = ((deg % 360) + 360) % 360;
  return deg * DEG;
}

function equatorialToEcef(raDeg, decDeg, gst) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const th = ra - gst;
  const c = Math.cos(dec);
  return [c * Math.cos(th), Math.sin(dec), c * Math.sin(th)];
}

function project(camera, vec, w, h) {
  const lat = (camera.lat || 0) * DEG;
  const lon = (camera.lon || 0) * DEG;
  const n = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  const east = [-Math.sin(lon), 0, Math.cos(lon)];
  const north = [-Math.sin(lat) * Math.cos(lon), Math.cos(lat), -Math.sin(lat) * Math.sin(lon)];
  const pitch = camera.pitch || 0;
  const yaw = camera.yaw || 0;
  const roll = camera.roll || 0;
  const dist = Math.max(1, camera.heightKm || 90000);
  const earthR = 6371;
  const ox = n[0] * Math.cos(pitch) * dist + north[0] * Math.sin(pitch) * Math.cos(yaw) * dist + east[0] * Math.sin(pitch) * Math.sin(yaw) * dist;
  const oy = n[1] * Math.cos(pitch) * dist + north[1] * Math.sin(pitch) * Math.cos(yaw) * dist + east[1] * Math.sin(pitch) * Math.sin(yaw) * dist;
  const oz = n[2] * Math.cos(pitch) * dist + north[2] * Math.sin(pitch) * Math.cos(yaw) * dist + east[2] * Math.sin(pitch) * Math.sin(yaw) * dist;
  let lx = 0, ly = 0, lz = 0;
  if ((camera.heightKm || 0) <= 20000) {
    lx = n[0] * earthR;
    ly = n[1] * earthR;
    lz = n[2] * earthR;
  }
  const R = 1e9;
  const px = vec[0] * R, py = vec[1] * R, pz = vec[2] * R;
  let fx = lx - ox, fy = ly - oy, fz = lz - oz;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  let ux = n[0], uy = n[1], uz = n[2];
  let rx = fy * uz - fz * uy;
  let ry = fz * ux - fx * uz;
  let rz = fx * uy - fy * ux;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  ux = ry * fz - rz * fy;
  uy = rz * fx - rx * fz;
  uz = rx * fy - ry * fx;
  if (roll) {
    const c = Math.cos(roll), s = Math.sin(roll);
    const nux = ux * c + rx * s, nuy = uy * c + ry * s, nuz = uz * c + rz * s;
    const nrx = rx * c - ux * s, nry = ry * c - uy * s, nrz = rz * c - uz * s;
    ux = nux; uy = nuy; uz = nuz;
    rx = nrx; ry = nry; rz = nrz;
  }
  const dx = px - ox, dy = py - oy, dz = pz - oz;
  const camZ = dx * fx + dy * fy + dz * fz;
  if (camZ <= 0) return null;
  const camX = dx * rx + dy * ry + dz * rz;
  const camY = dx * ux + dy * uy + dz * uz;
  const fov = (camera.fov || 45) * DEG;
  const aspect = w / Math.max(1, h);
  const tan = Math.tan(fov / 2);
  const ndcY = camY / camZ / tan;
  const ndcX = camX / camZ / (tan * aspect);
  if (Math.abs(ndcX) > 4 || Math.abs(ndcY) > 4) return null;
  return [(ndcX * 0.5 + 0.5) * w, (1 - (ndcY * 0.5 + 0.5)) * h];
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw() {
  if (!ctx || !canvas) return;
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  if (!data || !cam || enabled.size === 0) return;
  const gst = gmstRad(timeIso);
  for (const id of enabled) {
    const pack = data.cultures[id];
    if (!pack) continue;
    ctx.strokeStyle = COLORS[id] || "#d8d0a8";
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 0.92;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const fig of pack.figures) {
      for (const line of fig.lines) {
        let started = false;
        ctx.beginPath();
        for (const [ra, dec] of line) {
          const p = project(cam, equatorialToEcef(ra, dec, gst), w, h);
          if (!p) {
            started = false;
            continue;
          }
          if (!started) { ctx.moveTo(p[0], p[1]); started = true; }
          else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function setSkyCulture(id, on) {
  if (on) enabled.add(id);
  else enabled.delete(id);
  draw();
}

export function setSkyCamera(c) {
  cam = c;
  draw();
}

export function setSkyTime(iso) {
  if (iso) timeIso = iso;
  draw();
}

export function skyCultureState() {
  return Object.fromEntries([...enabled].map((id) => [id, true]));
}

export function isSkyCultureOn(id) {
  return enabled.has(id);
}

window.addEventListener("resize", resize);

fetch(new URL("./shared/cultures/stellarium-figures.json", import.meta.url))
  .then((r) => r.json())
  .then((d) => { data = d; resize(); })
  .catch((e) => console.warn("orrery: stellarium figures", e));

if (canvas) resize();
