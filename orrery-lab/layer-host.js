/** Create a full-viewport iframe layer for one verbatim app copy. */
export function createLayer({ id, frame, color, container }) {
  const wrap = document.createElement("div");
  wrap.className = "layer";
  wrap.dataset.id = id;
  wrap.style.setProperty("--layer-color", color);
  const iframe = document.createElement("iframe");
  iframe.title = id;
  iframe.setAttribute("allow", "clipboard-write");
  iframe.src = frame;
  wrap.appendChild(iframe);
  container.appendChild(wrap);

  let ready = false;
  let queue = [];
  const errors = [];

  function send(msg) {
    const payload = Object.assign({ source: "orrery-host", id }, msg);
    if (!ready || !iframe.contentWindow) {
      queue.push(payload);
      return;
    }
    iframe.contentWindow.postMessage(payload, "*");
  }

  function onMessage(e) {
    const d = e.data;
    if (!d || d.source !== "orrery-layer") return;
    if (d.id && d.id !== id && d.type !== "orrery:hello") return;
    // hello may arrive before init assigned the id
    if (d.type === "orrery:hello" && e.source === iframe.contentWindow) {
      ready = true;
      const rest = queue; queue = [];
      rest.forEach((m) => iframe.contentWindow.postMessage(m, "*"));
    }
    if (d.type === "orrery:error" && (!d.id || d.id === id || e.source === iframe.contentWindow)) {
      errors.push({ time: d.time || new Date().toISOString(), message: d.message, stack: d.stack });
    }
  }
  window.addEventListener("message", onMessage);

  return {
    id,
    wrap,
    iframe,
    errors,
    send,
    init(payload) { send(Object.assign({ type: "orrery:init" }, payload)); },
    setFeature(name, on) { send({ type: "orrery:setFeature", name, on }); },
    setCamera(camera) { send({ type: "orrery:setCamera", camera }); },
    setTime(iso) { send({ type: "orrery:setTime", iso }); },
    pick(nx, ny) { send({ type: "orrery:pick", nx, ny }); },
    setVisible(on) { wrap.classList.toggle("off", !on); },
    setOpacity(v) { wrap.style.opacity = String(v); },
    destroy() {
      window.removeEventListener("message", onMessage);
      wrap.remove();
    },
  };
}
