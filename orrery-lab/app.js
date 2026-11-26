import { APPS, ACCOUNTED, FRAMES, STORAGE_KEY, REPORT_FORMAT, REPOS, CULTURES, appById } from "./catalog.js";
import { createCameraController, defaultCamera, cloneCamera } from "./camera-controller.js";
import { createLayer } from "./layer-host.js";
import { setSkyCulture, setSkyCamera, setSkyTime, skyCultureState } from "./culture-sky.js";

const layersRoot = document.getElementById("layers");
const overlay = document.getElementById("nav-overlay");
const tagsEl = document.getElementById("tags");
const menuBody = document.getElementById("menu-body");
const menu = document.getElementById("menu");

const defaultFeatures = (app) => {
  const o = {};
  (app.features || []).forEach((f) => { o[f.id] = !!f.default; });
  return o;
};

function loadState() {
  const base = {
    camera: defaultCamera(),
    time: new Date().toISOString(),
    playing: false,
    layers: {},
    skyCultures: {},
    drive: "shared",
  };
  CULTURES.forEach((c) => {
    if (c.hostOverlay) base.skyCultures[c.hostOverlay] = false;
  });
  APPS.forEach((a) => {
    base.layers[a.id] = {
      visible: !!a.defaultOn,
      opacity: 1,
      features: defaultFeatures(a),
    };
  });
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (saved.camera) base.camera = { ...base.camera, ...saved.camera };
    if (saved.time) base.time = saved.time;
    if (saved.drive) base.drive = saved.drive;
    if (saved.skyCultures) {
      Object.keys(base.skyCultures).forEach((k) => {
        if (k in saved.skyCultures) base.skyCultures[k] = !!saved.skyCultures[k];
      });
    }
    if (saved.layers) {
      APPS.forEach((a) => {
        const s = saved.layers[a.id];
        if (!s) return;
        base.layers[a.id].visible = !!s.visible;
        base.layers[a.id].opacity = s.opacity == null ? 1 : Number(s.opacity);
        base.layers[a.id].features = { ...base.layers[a.id].features, ...(s.features || {}) };
      });
    }
  } catch (e) { console.warn("orrery: state", e); }
  return base;
}

let state = loadState();
const hosts = {};
const pendingPicks = [];
const errorsHost = [];

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      camera: state.camera,
      time: state.time,
      layers: state.layers,
      skyCultures: state.skyCultures,
      drive: state.drive,
    }));
  } catch (e) {}
}

function ensureHost(id) {
  if (hosts[id]) return hosts[id];
  const app = appById(id);
  const frame = FRAMES[id];
  if (!app || !frame) return null;
  const host = createLayer({ id, frame, color: app.color, container: layersRoot });
  hosts[id] = host;
  host.init({
    id,
    color: app.color,
    features: state.layers[id].features,
    camera: state.camera,
    time: state.time,
  });
  host.setVisible(state.layers[id].visible);
  host.setOpacity(state.layers[id].opacity);
  return host;
}

function broadcastCamera() {
  APPS.forEach((a) => {
    if (state.layers[a.id].visible && hosts[a.id]) hosts[a.id].setCamera(state.camera);
  });
  setSkyCamera(state.camera);
}
function broadcastTime() {
  APPS.forEach((a) => {
    if (state.layers[a.id].visible && hosts[a.id]) hosts[a.id].setTime(state.time);
  });
  setSkyTime(state.time);
}

const controller = createCameraController(overlay, {
  onChange(cam) {
    state.camera = cam;
    save();
    broadcastCamera();
  },
  onTap(x, y, el) {
    const r = el.getBoundingClientRect();
    const nx = (x - r.left) / r.width;
    const ny = (y - r.top) / r.height;
    requestPicks(nx, ny, x, y);
  },
  onDoubleTap() { /* zoom already applied in the controller */ },
});
controller.setState(state.camera);
setSkyCamera(state.camera);
setSkyTime(state.time);
Object.entries(state.skyCultures).forEach(([id, on]) => setSkyCulture(id, on));


function requestPicks(nx, ny, clientX, clientY) {
  const visible = APPS.filter((a) => state.layers[a.id].visible && hosts[a.id]);
  if (!visible.length) { tagsEl.innerHTML = ""; return; }
  const token = Date.now() + Math.random();
  const bucket = { token, nx, ny, clientX, clientY, need: visible.length, hits: [] };
  pendingPicks.splice(0, pendingPicks.length, bucket);
  const onMsg = function handler(e) {
    const d = e.data;
    if (!d || d.source !== "orrery-layer" || d.type !== "orrery:pick-result") return;
    if (pendingPicks[0] !== bucket) { window.removeEventListener("message", handler); return; }
    const app = appById(d.id);
    (d.hits || []).forEach((h) => {
      bucket.hits.push({ name: h.name || h, color: app ? app.color : "#fff", layer: d.id, title: app ? app.title : d.id });
    });
    bucket.need -= 1;
    if (bucket.need <= 0) {
      window.removeEventListener("message", handler);
      renderTags(bucket);
    }
  };
  window.addEventListener("message", onMsg);
  visible.forEach((a) => hosts[a.id].pick(nx, ny));
  setTimeout(() => {
    if (pendingPicks[0] === bucket && bucket.need > 0) {
      window.removeEventListener("message", onMsg);
      renderTags(bucket);
    }
  }, 800);
}

function renderTags(bucket) {
  tagsEl.innerHTML = "";
  if (!bucket.hits.length) return;
  bucket.hits.forEach((h, i) => {
    const el = document.createElement("div");
    el.className = "tag";
    el.style.setProperty("--tag-color", h.color);
    el.style.left = bucket.clientX + "px";
    el.style.top = bucket.clientY + i * 22 + "px";
    el.textContent = h.name + " · " + h.title;
    tagsEl.appendChild(el);
  });
}

overlay.addEventListener("pointerdown", () => {
  // A later empty-space tap hides tags; the controller fires onTap after the delay.
});

function hideTagsIfEmptyPick(bucket) {
  if (!bucket.hits.length) tagsEl.innerHTML = "";
}

// Rebuild tag hide: if a tap returns no hits, clear. Already handled in renderTags.

function setLayerVisible(id, on) {
  state.layers[id].visible = on;
  if (on) {
    const h = ensureHost(id);
    if (h) {
      h.setVisible(true);
      h.setCamera(state.camera);
      h.setTime(state.time);
    }
  } else if (hosts[id]) {
    hosts[id].setVisible(false);
    if (state.drive === id) setDrive("shared");
  }
  applyDrive();
  save();
}

function applyDrive() {
  const native = state.drive && state.drive !== "shared";
  overlay.classList.toggle("drive-native", !!native);
  APPS.forEach((a) => {
    const host = hosts[a.id];
    if (!host) return;
    const isActive = native && a.id === state.drive;
    host.wrap.classList.toggle("drive-native", isActive);
    if (host.setDrive) host.setDrive(isActive);
  });
}

function setDrive(id) {
  state.drive = id || "shared";
  if (state.drive !== "shared") {
    if (!state.layers[state.drive]) state.drive = "shared";
    else if (!state.layers[state.drive].visible) {
      setLayerVisible(state.drive, true);
    }
  }
  applyDrive();
  if (state.drive === "shared") broadcastCamera();
  save();
  const sel = document.getElementById("drive-select");
  if (sel) sel.value = state.drive;
}

function renderMenu() {

  const legend = APPS.map((a) =>
    `<span class="swatch"><i class="dot" style="background:${a.color}"></i>${escapeHtml(a.title)}</span>`
  ).join("");

  const cameraNotes = APPS.map((a) => {
    if (a.camera === "none") return `<div class="note">${escapeHtml(a.title)}: cannot follow the shared 3D camera.</div>`;
    if (a.camera === "partial-2d") return `<div class="note">${escapeHtml(a.title)}: pan/zoom (and globe lat/lon) only; pitch/roll are limited or unused.</div>`;
    if (a.camera === "maplibre") return `<div class="note">${escapeHtml(a.title)}: follows lat/lon/height/yaw/pitch. No roll.</div>`;
    return "";
  }).join("");

  const cards = APPS.map((a) => {
    const st = state.layers[a.id];
    const feats = (a.features || []).map((f) => {
      const on = st.features[f.id];
      const plan = f.planId ? ` <span class="note">(${f.planId})</span>` : "";
      return `<label><input type="checkbox" data-feat="${a.id}:${f.id}" ${on ? "checked" : ""}><span>${escapeHtml(f.label)}${plan}</span></label>`;
    }).join("");
    return `<div class="layer-card">
      <div class="layer-head">
        <i class="dot" style="background:${a.color}"></i>
        <label><input type="checkbox" data-vis="${a.id}" ${st.visible ? "checked" : ""}><strong>${escapeHtml(a.title)}</strong></label>
      </div>
      <div class="note">${escapeHtml(a.stack)}</div>
      <label class="note">Opacity <input type="range" min="0" max="1" step="0.02" value="${st.opacity}" data-op="${a.id}"></label>
      <div class="features">${feats}</div>
    </div>`;
  }).join("");

  const driveOpts = [`<option value="shared">Shared camera</option>`].concat(
    APPS.map((a) => `<option value="${a.id}" ${state.drive === a.id ? "selected" : ""}>${escapeHtml(a.title)}</option>`)
  ).join("");
  menuBody.innerHTML = `
    <div class="legend drive-row">
      <h2>Drive</h2>
      <label class="note">Input goes to
        <select id="drive-select" aria-label="Which camera to drive">${driveOpts}</select>
      </label>
      <p class="note">Shared camera orbits every layer that can follow. If a layer cannot follow, pick it here to use its own controls.</p>
    </div>
    <div class="legend">
      <h2>Color key</h2>
      <div>${legend}</div>
      <p class="note">A single tap tags every visible layer's body under the point, each in that layer's color. Tap empty space to hide. Double-tap zooms in.</p>
    </div>
    <div class="legend" id="cultures">
      <h2>Cultural skies</h2>
      <div class="features" id="culture-toggles"></div>
      <p class="note">European / IAU and Chinese figures use the existing d3-celestial catalogs inside the copied apps (BSD-3-Clause). Arabic anwāʾ, Indian nakshatras, and Māori Tātai Arorangi are drawn on the shared overlay from vendored Stellarium skycultures (AGPL-3.0). Other traditions stay listed and are not invented. Inca / Emu dark constellations still need sourced dust-lane outlines. Military and intelligence questions in the research file are ignored.</p>
    </div>
    <div class="clock">
      <h2>Shared clock</h2>
      <div class="clock-row">
        <input id="clock-input" type="datetime-local" step="1" aria-label="Shared UTC time">
        <button type="button" id="btn-now">Now</button>
      </div>
      <p class="note">One time is sent to every visible layer that exposes setTime. Layers that cannot accept it are listed in the README.</p>
      ${cameraNotes}
    </div>
    ${cards}
    <div class="note">Kaleidoscope (KAL-01) is not mounted here and is not modified. FeistTech /orrery/ is a working entry point and is not replaced. Evidence labels in each README use the 23 Oct 2026 plan terms: source present, runtime verified, or unresolved.</div>
  `;

  const ct = document.getElementById("culture-toggles");
  if (ct) {
    ct.innerHTML = CULTURES.map((c) => {
      const live = !!(c.inApps || c.hostOverlay);
      const disabled = live ? "" : "disabled";
      const checked = c.hostOverlay
        ? !!state.skyCultures[c.hostOverlay]
        : (c.inApps && APPS.some((a) => state.layers[a.id].features[c.feature]));
      const ev = c.status === "sourced-data" ? "sourced data" : "from user research text";
      const where = c.hostOverlay ? "; host overlay" : (c.inApps ? "" : "; next step");
      return `<label class="${live ? "" : "pending"}"><input type="checkbox" data-culture="${c.id}" ${disabled} ${checked ? "checked" : ""}><span><strong>${escapeHtml(c.native)}</strong> — ${escapeHtml(c.label)} <span class="note">(${ev}${where})</span><br><span class="note">${escapeHtml(c.note)}</span></span></label>`;
    }).join("");
    ct.querySelectorAll("[data-culture]").forEach((el) => {
      el.addEventListener("change", () => {
        const c = CULTURES.find((x) => x.id === el.dataset.culture);
        if (!c) return;
        if (c.hostOverlay) {
          state.skyCultures[c.hostOverlay] = el.checked;
          setSkyCulture(c.hostOverlay, el.checked);
          save();
          return;
        }
        if (!c.feature) return;
        APPS.forEach((a) => {
          if (!a.features.some((f) => f.id === c.feature)) return;
          state.layers[a.id].features[c.feature] = el.checked;
          if (state.layers[a.id].visible) ensureHost(a.id)?.setFeature(c.feature, el.checked);
        });
        save();
        menuBody.querySelectorAll(`[data-feat$=":${c.feature}"]`).forEach((box) => { box.checked = el.checked; });
      });
    });
  }


  const driveSel = document.getElementById("drive-select");
  if (driveSel) {
    driveSel.value = state.drive || "shared";
    driveSel.addEventListener("change", () => setDrive(driveSel.value));
  }

  const clock = document.getElementById("clock-input");
  if (clock) clock.value = toLocalInput(state.time);
  menuBody.querySelectorAll("[data-vis]").forEach((el) => {
    el.addEventListener("change", () => setLayerVisible(el.dataset.vis, el.checked));
  });
  menuBody.querySelectorAll("[data-op]").forEach((el) => {
    el.addEventListener("input", () => {
      const id = el.dataset.op;
      state.layers[id].opacity = Number(el.value);
      if (state.layers[id].visible) ensureHost(id)?.setOpacity(state.layers[id].opacity);
      save();
    });
  });
  menuBody.querySelectorAll("[data-feat]").forEach((el) => {
    el.addEventListener("change", () => {
      const [id, feat] = el.dataset.feat.split(":");
      state.layers[id].features[feat] = el.checked;
      if (state.layers[id].visible) ensureHost(id)?.setFeature(feat, el.checked);
      save();
    });
  });
  document.getElementById("btn-now")?.addEventListener("click", () => {
    state.time = new Date().toISOString();
    if (clock) clock.value = toLocalInput(state.time);
    save();
    broadcastTime();
  });
  clock?.addEventListener("change", () => {
    const v = clock.value;
    if (!v) return;
    state.time = new Date(v + "Z").toISOString();
    save();
    broadcastTime();
  });
}

function toLocalInput(iso) {
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function deviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    touch: navigator.maxTouchPoints > 0 || "ontouchstart" in window,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    pixelRatio: window.devicePixelRatio || 1,
  };
}

function buildReport() {
  const versions = APPS.map((a) => {
    const st = state.layers[a.id];
    return {
      id: a.id,
      title: a.title,
      color: a.color,
      source: { repo: REPOS[a.repo]?.name, path: a.path, sha: REPOS[a.repo]?.sha, live: a.live },
      stack: a.stack,
      camera: a.camera,
      planIds: a.planIds || [],
      evidence: a.evidence,
      visible: st.visible,
      opacity: st.opacity,
      features: (a.features || []).map((f) => ({ id: f.id, label: f.label, on: !!st.features[f.id], planId: f.planId || null })),
      errors: (hosts[a.id]?.errors || []).slice(-50),
    };
  });
  return {
    format: REPORT_FORMAT,
    timestamp: new Date().toISOString(),
    timezone: "America/New_York",
    device: deviceInfo(),
    camera: state.camera,
    time: state.time,
    tagColors: Object.fromEntries(APPS.map((a) => [a.id, { title: a.title, color: a.color }])),
    visibleLayers: APPS.filter((a) => state.layers[a.id].visible).map((a) => a.id),
    drive: state.drive,
    versions,
    accountedButNotMounted: ACCOUNTED,
    hostErrors: errorsHost.slice(-50),
    cultures: CULTURES.map((c) => ({ id: c.id, label: c.label, native: c.native, status: c.status, inApps: !!c.inApps, hostOverlay: c.hostOverlay || null, feature: c.feature || null, on: c.hostOverlay ? !!state.skyCultures[c.hostOverlay] : (c.feature ? APPS.some((a) => state.layers[a.id].visible && state.layers[a.id].features[c.feature]) : false) })),
    skyCultures: skyCultureState(),
    repos: REPOS,
  };
}

async function onReport() {
  const report = buildReport();
  const text = JSON.stringify(report, null, 2);
  const name = "orrery-debug-report-" + report.timestamp.replace(/[:.]/g, "-") + ".json";
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) { console.warn("clipboard", e); }
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.getElementById("btn-reset").addEventListener("click", () => {
  controller.reset();
  tagsEl.innerHTML = "";
});
document.getElementById("btn-report").addEventListener("click", onReport);
document.getElementById("btn-collapse").addEventListener("click", () => {
  const c = menu.classList.toggle("collapsed");
  document.getElementById("btn-collapse").setAttribute("aria-expanded", String(!c));
});

window.addEventListener("error", (e) => {
  errorsHost.push({ time: new Date().toISOString(), message: String(e.message || e), stack: e.error && e.error.stack });
});


window.__orreryHarness = {
  pickAt(nx, ny, x, y) { requestPicks(nx, ny, x, y); },
  getCamera() { return { ...state.camera }; },
};


if (window.matchMedia && window.matchMedia("(max-width: 720px)").matches) {
  menu.classList.add("collapsed");
  const bc = document.getElementById("btn-collapse");
  if (bc) bc.setAttribute("aria-expanded", "false");
}
applyDrive();

renderMenu();
APPS.forEach((a) => { if (state.layers[a.id].visible) ensureHost(a.id); });
applyDrive();
