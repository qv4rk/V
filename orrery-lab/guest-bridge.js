/**
 * Integration adapter injected into each verbatim app copy.
 * Does not reimplement ephemeris, eclipse, or chart math.
 * Speaks the harness protocol: setCamera, setTime, setFeature, pick.
 */
(function () {
  "use strict";
  if (window.__orreryBridge) return;
  window.__orreryBridge = true;

  // Resolve FeistTech root paths onto this harness folder so GitHub Pages
  // (and a plain static server) work without serve.py aliases.
  const HARNESS_ROOT = (function () {
    const src = document.currentScript && document.currentScript.src;
    if (src) return src.replace(/guest-bridge\.js(?:\?.*)?$/, "");
    return new URL("../", document.baseURI).href;
  })();
  const PATH_ALIASES = {
    "/vendor/d3/d3.v7.min.js": "shared/vendor/d3/d3.v7.min.js",
    "/vendor/d3/LICENSE": "shared/vendor/d3/LICENSE",
    "/vendor/topojson-client/topojson-client.min.js": "shared/vendor/topojson-client/dist/topojson-client.min.js",
    "/vendor/astronomy-engine/astronomy-engine.min.js": "shared/vendor/astronomy/astronomy-engine.min.js",
    "/vendor/maplibre-gl-5/maplibre-gl.js": "shared/vendor/maplibre-gl-js/dist/maplibre-gl.js",
    "/vendor/maplibre-gl-5/maplibre-gl.css": "shared/vendor/maplibre-gl-js/dist/maplibre-gl.css",
    "/vendor/maplibre-gl/maplibre-gl.js": "shared/vendor/maplibre-gl-js/dist/maplibre-gl.js",
    "/vendor/maplibre-gl/maplibre-gl.css": "shared/vendor/maplibre-gl-js/dist/maplibre-gl.css",
    "/vendor/three/three.module.min.js": "shared/vendor/three.js/build/three.module.min.js",
    "/vendor/three/three.module.js": "shared/vendor/three.js/build/three.module.js",
    "/vendor/three/OrbitControls.js": "shared/vendor/three.js/examples/jsm/controls/OrbitControls.js",
    "/vendor/satellite-js/satellite.min.js": "shared/vendor/satellite-js/satellite.min.js",
    "/vendor/world-atlas/land-110m.json": "shared/vendor/world-atlas/land-110m.json",
    "/vendor/world-atlas/LICENSE": "shared/vendor/world-atlas/LICENSE",
    "/vendor/d3-celestial/stars.6.json": "shared/stars/stars.6.json",
    "/vendor/d3-celestial/constellations.lines.json": "shared/constellations/western-lines.json",
    "/vendor/d3-celestial/constellations.lines.cn.json": "shared/constellations/chinese-lines.json",
    "/vendor/d3-celestial/constellations.json": "shared/constellations/western-names.json",
    "/data/eclipses.json": "shared/eclipses/five-millennium.json",
    "/data/events.json": "shared/geo/events.json",
    "/site.js": "stubs/site.js",
    "/portal.js": "stubs/portal.js",
  };
  function rewriteHarnessUrl(input) {
    try {
      const base = (typeof location !== "undefined" && location.href) || HARNESS_ROOT;
      const u = new URL(input, base);
      if (u.origin !== location.origin) return input;
      const mapped = PATH_ALIASES[u.pathname];
      if (mapped) return new URL(mapped, HARNESS_ROOT).href + u.search + u.hash;
    } catch (e) {}
    return input;
  }
  try {
    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === "string") input = rewriteHarnessUrl(input);
      else if (input && typeof input.url === "string") {
        const rewritten = rewriteHarnessUrl(input.url);
        if (rewritten !== input.url) input = new Request(rewritten, input);
      }
      return origFetch.call(this, input, init);
    };
    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
      const xhr = new OrigXHR();
      const origOpen = xhr.open;
      xhr.open = function (method, url) {
        const args = Array.prototype.slice.call(arguments);
        if (typeof args[1] === "string") args[1] = rewriteHarnessUrl(args[1]);
        return origOpen.apply(xhr, args);
      };
      return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;
  } catch (e) { console.warn("orrery: path rewrite", e); }

  const NAV_FIX = "2026-11-25-nav3";
  const state = {
    id: null,
    api: {},
    features: {},
    ready: false,
  };

  function wrapMapLibre() {
    try {
      if (window.maplibregl && window.maplibregl.Map && !window.maplibregl.Map.__orreryWrapped) {
        const Orig = window.maplibregl.Map;
        function Wrapped(opts) {
          const m = new Orig(opts);
          window.__orreryMaps = window.__orreryMaps || [];
          window.__orreryMaps.push(m);
          window.map = m;
          return m;
        }
        Wrapped.prototype = Orig.prototype;
        Wrapped.__orreryWrapped = true;
        window.maplibregl.Map = Wrapped;
      }
    } catch (e) { console.warn("orrery: maplibre wrap", e); }
  }
  wrapMapLibre();
  document.addEventListener("DOMContentLoaded", wrapMapLibre);
  window.addEventListener("load", wrapMapLibre);
  // Capture Map constructed after this script (typical: library tag, then an IIFE).
  if (!window.maplibregl) {
    try {
      let stored;
      Object.defineProperty(window, "maplibregl", {
        configurable: true,
        enumerable: true,
        get() { return stored; },
        set(v) {
          stored = v;
          wrapMapLibre();
        }
      });
    } catch (e) {}
  }

  function post(msg) {
    try { parent.postMessage(Object.assign({ source: "orrery-layer", id: state.id }, msg), "*"); }
    catch (e) {}
  }

  window.addEventListener("error", function (e) {
    post({ type: "orrery:error", message: String(e.message || e), stack: e.error && e.error.stack, time: new Date().toISOString() });
  });
  window.addEventListener("unhandledrejection", function (e) {
    const r = e.reason;
    post({ type: "orrery:error", message: String(r && r.message || r), stack: r && r.stack, time: new Date().toISOString() });
  });

  const origError = console.error;
  console.error = function () {
    try { post({ type: "orrery:error", message: Array.from(arguments).map(String).join(" "), time: new Date().toISOString() }); } catch (e) {}
    return origError.apply(console, arguments);
  };

  function mapInstance() {
    if (window.map && window.map.jumpTo) return window.map;
    const list = window.__orreryMaps;
    return list && list[0];
  }

  function atlas() { return window.__atlas; }

  function applyChrome(on) {
    document.documentElement.classList.toggle("orrery-hide-chrome", !on);
  }
  function applyOpaque(on) {
    document.documentElement.classList.toggle("orrery-transparent", !on);
    document.documentElement.classList.toggle("orrery-opaque", on);
    // Best-effort: leave existing Three scenes alone if we cannot reach the renderer.
    const a = atlas();
    if (a && a.renderer && a.renderer.setClearColor) {
      a.renderer.setClearColor(0x000000, on ? 1 : 0);
    }
  }

  function setCheckbox(id, on) {
    const el = document.getElementById(id);
    if (!el) return false;
    if (el.checked !== !!on) {
      el.checked = !!on;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }
  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function clickIf(id) {
    const el = document.getElementById(id);
    if (el) { el.click(); return true; }
    return false;
  }

  function setFeature(name, on) {
    state.features[name] = !!on;
    if (state.api.setFeature) {
      try { state.api.setFeature(name, !!on); } catch (e) { console.warn(e); }
    }
    if (name === "app-chrome") return applyChrome(on);
    if (name === "opaque-background") return applyOpaque(on);
    if (name === "starfield") {
      const c = document.getElementById("starfield-canvas");
      if (c) c.style.display = on ? "" : "none";
      return;
    }
    if (name === "pdf-export") {
      const b = document.getElementById("btn-export-pdf");
      if (b) b.style.display = on ? "" : "none";
      return;
    }

    // Atlas preview / globe controls already in the copied DOM
    if (name === "outlines-western" || name === "outlines-chinese" || name === "star-map") {
      const west = state.features["outlines-western"] !== false;
      const east = state.features["outlines-chinese"] !== false;
      const stars = state.features["star-map"] !== false;
      let culture = "off";
      if (stars || west || east) {
        if (west && east) culture = "both";
        else if (west) culture = "western";
        else if (east) culture = "chinese";
        else culture = "both"; // stars only: keep group visible, figures off if possible
      }
      setSelect("culture", stars || west || east ? culture : "off");
      const a = atlas();
      if (a && a.cosmos) {
        try {
          if (a.cosmos.setCulture) a.cosmos.setCulture(culture);
          if (a.cosmos.group) a.cosmos.group.visible = culture !== "off" && stars;
        } catch (e) {}
      }
      return;
    }
    if (name === "constellation-labels") return setCheckbox("names", on);
    if (name === "true-scale") {
      const btn = document.getElementById("scale");
      const a = atlas();
      if (a && a.orrery && a.orrery.setScaleMode) {
        a.orrery.setScaleMode(on ? "true" : "visible");
        if (btn) btn.textContent = on ? "Show visible scale" : "Show true scale";
        return;
      }
      if (btn && /true|visible/i.test(btn.textContent)) {
        const looksTrue = /visible scale/i.test(btn.textContent);
        if (looksTrue !== on) btn.click();
      }
      return;
    }
    if (name === "shadow-cones") return setCheckbox("cones", on);
    if (name === "ground-track") return setCheckbox("track", on);
    if (name === "oumuamua") return setCheckbox("layer-oumuamua", on);
    if (name === "planet-nine") return setCheckbox("layer-nine", on);
    if (name === "perseids") return setCheckbox("layer-perseids", on);
    if (name === "satellites") return setCheckbox("layer-satellites", on);
    if (name === "book-mode") {
      const btn = document.getElementById("book-toggle");
      if (btn) {
        const tools = document.getElementById("book-tools");
        const shown = tools && !tools.hidden;
        if (shown !== on) btn.click();
      }
      return;
    }
    if (name === "orbits") return setCheckbox("l-orbits", on);
    if (name === "labels") return setCheckbox("l-labels", on);
    if (name === "asteroid-belt") return setCheckbox("l-belt", on);
    if (name === "pluto") return setCheckbox("l-pluto", on) || setCheckbox("pluto", on);
    if (name === "street-tiles" || name === "globe-projection" || name === "damage-footprints") {
      const m = mapInstance();
      if (!m) return;
      try {
        if (name === "globe-projection" && m.setProjection) {
          m.setProjection({ type: on ? "globe" : "mercator" });
        }
      } catch (e) {}
      return;
    }
  }

  function heightToZoom(heightKm, lat, fov, heightPx) {
    const heightM = Math.max(1, heightKm * 1000);
    const fovRad = ((fov || 45) * Math.PI) / 180;
    const visibleM = 2 * heightM * Math.tan(fovRad / 2);
    const metersPerPixel = visibleM / Math.max(1, heightPx || window.innerHeight);
    const cos = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
    const zoom = Math.log2(40075016.686 * cos / (512 * metersPerPixel));
    return Math.max(0, Math.min(22, zoom));
  }

  let lastCam = null;
  let driveNative = false;

  function vec3Ctor(camera) {
    if (window.THREE && window.THREE.Vector3) return window.THREE.Vector3;
    if (camera && camera.position && camera.position.constructor) return camera.position.constructor;
    return null;
  }

  function earthMesh(a) {
    try {
      const b = a && a.orrery && a.orrery.bodies && a.orrery.bodies.earth;
      return b && (b.mesh || b);
    } catch (e) { return null; }
  }

  function inferUnitsPerKm(a, camera, Vector3) {
    try {
      const mesh = earthMesh(a);
      if (mesh && mesh.geometry) {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const r = mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius;
        let s = 1;
        if (mesh.getWorldScale && Vector3) {
          const v = new Vector3();
          mesh.getWorldScale(v);
          s = v.x || 1;
        } else if (mesh.scale) s = mesh.scale.x || 1;
        if (r && r * s > 0) return (r * s) / 6371;
      }
    } catch (e) {}
    return null;
  }

  function captureHome(camera, controls, Vector3) {
    if (!camera || camera.__orreryHomeDist || !Vector3) return;
    try {
      const t = (controls && controls.target)
        ? controls.target.clone()
        : new Vector3(0, 0, 0);
      const d = camera.position.distanceTo(t);
      if (d > 1e-4) {
        camera.__orreryHomeDist = d;
        camera.__orreryHomeTarget = t;
      }
    } catch (e) {}
  }

  function applyThreeEarthCamera(camera, cam, a) {
    const Vector3 = vec3Ctor(camera);
    if (!camera || !Vector3 || !cam) return false;
    const controls = (a && a.controls) || (sceneHandle() && sceneHandle().controls);
    captureHome(camera, controls, Vector3);
    const lat = (cam.lat * Math.PI) / 180;
    const lon = (cam.lon * Math.PI) / 180;
    const n = new Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    const east = new Vector3(-Math.sin(lon), 0, Math.cos(lon));
    const north = new Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), -Math.sin(lat) * Math.sin(lon));
    let earthPos = new Vector3();
    const mesh = earthMesh(a);
    try { if (mesh && mesh.getWorldPosition) mesh.getWorldPosition(earthPos); } catch (e) {}
    let unitsPerKm = inferUnitsPerKm(a, camera, Vector3);
    if (unitsPerKm == null) {
      const home = camera.__orreryHomeDist || 80;
      unitsPerKm = home / 90000;
      if (camera.__orreryHomeTarget) earthPos.copy(camera.__orreryHomeTarget);
    }
    const dist = Math.max(1e-9, cam.heightKm * unitsPerKm);
    const pitch = cam.pitch || 0;
    const yaw = cam.yaw || 0;
    const offset = n.clone().multiplyScalar(Math.cos(pitch) * dist)
      .add(north.clone().multiplyScalar(Math.sin(pitch) * Math.cos(yaw) * dist))
      .add(east.clone().multiplyScalar(Math.sin(pitch) * Math.sin(yaw) * dist));
    const lookAt = cam.heightKm > 20000
      ? earthPos.clone()
      : earthPos.clone().add(n.clone().multiplyScalar(6371 * unitsPerKm));
    if (cam.fov && camera.fov !== cam.fov && camera.updateProjectionMatrix) {
      camera.fov = cam.fov;
    }
    camera.near = Math.max(1e-8, dist / 1e6);
    camera.far = Math.max(camera.far || 1000, dist * 100 + 10);
    if (camera.updateProjectionMatrix) camera.updateProjectionMatrix();
    camera.position.copy(lookAt).add(offset);
    camera.up.copy(n);
    camera.lookAt(lookAt);
    if (cam.roll) camera.rotateZ(cam.roll);
    if (camera.updateMatrixWorld) camera.updateMatrixWorld();
    return true;
  }

  function sceneHandle() {
    return window.__orreryScene || null;
  }

  function allControlObjects() {
    const list = [];
    const a = atlas();
    ["orbitControls", "earthControls", "controls"].forEach(function (k) {
      if (a && a[k]) list.push(a[k]);
    });
    const s = sceneHandle();
    if (s && s.controls) list.push(s.controls);
    const o = window.__orrery;
    if (o && o.controls && o.controls !== window.__orrery.setCamera) list.push(o.controls);
    if (window.__orreryControls) {
      window.__orreryControls.forEach(function (c) { list.push(c); });
    }
    return list;
  }

  function setControlsEnabled(on) {
    allControlObjects().forEach(function (c) {
      try {
        c.enabled = !!on;
        if (!on && c.update) {
          // Prevent damping from walking the camera after we disable it.
          try { c.enableDamping = false; } catch (e) {}
        }
      } catch (e) {}
    });
  }

  function setMapInteractive(on) {
    const m = mapInstance();
    if (!m) return;
    ["dragPan", "dragRotate", "scrollZoom", "touchZoomRotate", "touchPitch", "keyboard", "boxZoom", "doubleClickZoom"].forEach(function (k) {
      try {
        if (m[k] && m[k].enable) { on ? m[k].enable() : m[k].disable(); }
      } catch (e) {}
    });
  }

  function hookRenderer(renderer) {
    if (!renderer || !renderer.render || renderer.__orreryHooked) return;
    renderer.__orreryHooked = true;
    const orig = renderer.render;
    renderer.render = function (scene, camera) {
      if (camera) {
        const src = atlas() || sceneHandle() || {};
        captureHome(camera, src.controls, vec3Ctor(camera));
      }
      if (!driveNative && lastCam && camera) {
        applyThreeEarthCamera(camera, lastCam, atlas() || sceneHandle());
      }
      return orig.apply(this, arguments);
    };
  }

  function hookKnownRenderers() {
    const a = atlas();
    if (a && a.renderer) hookRenderer(a.renderer);
    const s = sceneHandle();
    if (s && s.renderer) hookRenderer(s.renderer);
    const o = window.__orrery;
    if (o && o.renderer) hookRenderer(o.renderer);
  }

  function applyGlobe(cam) {
    try {
      const app = window.__manifold || window.__manifoldAtlas;
      const earth = app && app.earth;
      if (!earth || !earth.rotation) return false;
      const yawDeg = ((cam.yaw || 0) * 180) / Math.PI;
      const pitchDeg = ((cam.pitch || 0) * 180) / Math.PI;
      earth.rotation[0] = -(cam.lon + yawDeg);
      earth.rotation[1] = -(cam.lat + pitchDeg * 0.6);
      if (earth.rotation.length > 2) earth.rotation[2] = ((cam.roll || 0) * 180) / Math.PI;
      if (typeof earth.setSpin === "function") earth.setSpin(false);
      earth.spin = false;
      if (typeof earth.setZoom === "function") {
        const z = Math.max(0.4, Math.min(24, 90000 / Math.max(200, cam.heightKm)));
        earth.setZoom(z);
      }
      return true;
    } catch (e) { return false; }
  }

  function applySolsys(cam) {
    try {
      const A = window.__solsys;
      if (!A || !A.cam) return false;
      if (typeof A.cam.centerOn === "function") {
        const dim = Math.min(A.W || 800, A.H || 800);
        const sc = Math.max(4, Math.min(dim / 2, dim / (70 * (cam.heightKm / 90000))));
        const worldW = (A.W || dim) / sc;
        const span = Math.min(22, worldW * 0.28);
        const ang = ((cam.lon * Math.PI) / 180) + (cam.yaw || 0);
        const x = Math.sin(ang) * span;
        const y = Math.sin((cam.lat * Math.PI) / 180) * span * 0.6
          + Math.sin(cam.pitch || 0) * span * 0.4;
        A.cam.centerOn(x, y, sc);
      }
      return true;
    } catch (e) { return false; }
  }

  function applySharedCamera(cam) {
    if (driveNative || !cam) return;
    wrapMapLibre();
    hookKnownRenderers();
    if (state.api.setCamera) {
      try { state.api.setCamera(cam); } catch (e) { console.warn(e); }
    }
    const m = mapInstance();
    if (m && m.jumpTo) {
      try {
        m.jumpTo({
          center: [cam.lon, cam.lat],
          zoom: heightToZoom(cam.heightKm, cam.lat, cam.fov, m.getContainer().clientHeight),
          bearing: ((cam.yaw || 0) * 180) / Math.PI,
          pitch: Math.min(85, Math.max(0, ((cam.pitch || 0) * 180) / Math.PI)),
        });
      } catch (e) { console.warn(e); }
    }
    const a = atlas();
    if (a && a.camera) {
      try {
        const c = typeof a.camera === "function" ? a.camera() : a.camera;
        applyThreeEarthCamera(c, cam, a);
      } catch (e) { console.warn(e); }
    }
    const s = sceneHandle();
    if (s && s.camera) {
      try { applyThreeEarthCamera(s.camera, cam, s); } catch (e) { console.warn(e); }
    }
    const o = window.__orrery;
    if (o && o.camera && o.camera.isCamera) {
      try { applyThreeEarthCamera(o.camera, cam, o); } catch (e) { console.warn(e); }
    }
    applyGlobe(cam);
    applySolsys(cam);
    setControlsEnabled(false);
    setMapInteractive(false);
  }

  function setCamera(cam) {
    if (!cam) return;
    lastCam = cam;
    if (driveNative) return;
    applySharedCamera(cam);
  }

  function setDriveMode(native) {
    driveNative = !!native;
    if (driveNative) {
      setControlsEnabled(true);
      setMapInteractive(true);
    } else if (lastCam) {
      applySharedCamera(lastCam);
    }
  }

  if (!window.__orreryRafHook) {
    window.__orreryRafHook = true;
    (function tick() {
      if (!driveNative && lastCam) {
        applyGlobe(lastCam);
        applySolsys(lastCam);
      }
      requestAnimationFrame(tick);
    })();
  }

  // Re-discover renderers / scene handles as apps boot.
  setInterval(function () {
    hookKnownRenderers();
    if (!driveNative && lastCam) applySharedCamera(lastCam);
  }, 1000);

  function setTime(iso) {
    if (!iso) return;
    if (state.api.setTime) {
      try { state.api.setTime(iso); } catch (e) {}
    }
    const a = atlas();
    if (a && a.setDate) {
      try { a.setDate(new Date(iso)); return; } catch (e) {}
    }
    const input = document.getElementById("date");
    if (input && input.type && input.type.indexOf("date") === 0) {
      try {
        const d = new Date(iso);
        input.value = iso.slice(0, 16);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {}
    }
  }

  function pick(nx, ny) {
    const hits = [];
    if (state.api.pick) {
      try {
        const r = state.api.pick(nx, ny);
        if (Array.isArray(r)) hits.push.apply(hits, r);
        else if (r && r.name) hits.push(r);
      } catch (e) {}
    }
    const a = atlas();
    if (a && a.camera) {
      try {
        const cam = typeof a.camera === "function" ? a.camera() : a.camera;
        const Vector3 = (window.THREE && window.THREE.Vector3) || (cam && cam.position && cam.position.constructor);
        const Raycaster = window.THREE && window.THREE.Raycaster;
        const Vector2 = window.THREE && window.THREE.Vector2;
        if (cam && cam.updateMatrixWorld) cam.updateMatrixWorld();
        if (Raycaster && Vector2 && a.scene) {
          const ray = new Raycaster();
          ray.setFromCamera(new Vector2(nx * 2 - 1, -(ny * 2 - 1)), cam);
          const scene = typeof a.scene === "function" ? a.scene() : a.scene;
          const objs = ray.intersectObjects(scene.children, true);
          objs.slice(0, 3).forEach(function (h) {
            let o = h.object;
            while (o && !o.name) o = o.parent;
            if (o && o.name) hits.push({ name: o.name });
          });
        }
        function consider(name, mesh, bucket) {
          if (!Vector3 || !mesh || !mesh.getWorldPosition) return;
          const v = new Vector3();
          mesh.getWorldPosition(v);
          if (!v.project) return;
          v.project(cam);
          if (!isFinite(v.x) || !isFinite(v.y) || v.z < -1 || v.z > 1) return;
          const dx = (v.x * 0.5 + 0.5) - nx;
          const dy = (1 - (v.y * 0.5 + 0.5)) - ny;
          const d = Math.hypot(dx, dy);
          if (d < 0.12) bucket.push({ name: name, d: d });
        }
        const near = [];
        if (a.orrery && a.orrery.bodies && cam) {
          Object.keys(a.orrery.bodies).forEach(function (name) {
            const body = a.orrery.bodies[name];
            const label = name.charAt(0).toUpperCase() + name.slice(1);
            consider(label, body && (body.mesh || body), near);
          });
        }
        if (a.scene && Vector3) {
          const scene = typeof a.scene === "function" ? a.scene() : a.scene;
          (function walk(o, depth) {
            if (!o || depth > 5) return;
            if (o.name && o.getWorldPosition) consider(o.name, o, near);
            (o.children || []).forEach(function (c) { walk(c, depth + 1); });
          })(scene, 0);
        }
        near.sort(function (x, y) { return x.d - y.d; });
        near.slice(0, 3).forEach(function (h) {
          if (!hits.some(function (x) { return String(x.name).toLowerCase() === h.name.toLowerCase(); })) {
            hits.push({ name: h.name });
          }
        });
      } catch (e) {}
    }
    const m = mapInstance();
    if (m && m.unproject) {
      try {
        const w = m.getContainer().clientWidth, h = m.getContainer().clientHeight;
        const ll = m.unproject([nx * w, ny * h]);
        hits.push({ name: "Earth " + ll.lat.toFixed(2) + "°, " + ll.lng.toFixed(2) + "°" });
      } catch (e) {}
    }
    return hits;
  }

  window.__orreryRegister = function (api) {
    state.api = api || {};
  };

  function publishApi() {
    const prev = window.__orrery || {};
    window.__orrery = Object.assign(prev, {
      setFeature: setFeature,
      setCamera: setCamera,
      setTime: setTime,
      pick: pick,
    });
  }
  try { window.__orreryNavFix = NAV_FIX; } catch (e) {}
  publishApi();
  // Re-attach if an app later replaces window.__orrery (e.g. scale-orrery).
  setInterval(publishApi, 2000);

  window.addEventListener("message", function (e) {
    const d = e.data;
    if (!d || d.source !== "orrery-host") return;
    if (d.type === "orrery:init") {
      state.id = d.id;
      document.documentElement.classList.add("orrery-transparent");
      applyChrome(false);
      if (d.features) {
        Object.keys(d.features).forEach(function (k) { setFeature(k, d.features[k]); });
      }
      if (d.camera) setCamera(d.camera);
      if (d.time) setTime(d.time);
      state.ready = true;
      post({ type: "orrery:ready" });
      return;
    }
    if (d.type === "orrery:setFeature") setFeature(d.name, d.on);
    if (d.type === "orrery:setCamera") setCamera(d.camera);
    if (d.type === "orrery:setTime") setTime(d.iso);
    if (d.type === "orrery:drive") setDriveMode(!!d.native);
    if (d.type === "orrery:pick") {
      post({ type: "orrery:pick-result", hits: pick(d.nx, d.ny) });
    }
  });

  function announce() {
    post({ type: "orrery:hello" });
  }
  if (document.readyState === "complete") setTimeout(announce, 50);
  else window.addEventListener("load", function () { setTimeout(announce, 50); });
})();
