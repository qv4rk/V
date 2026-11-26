#!/usr/bin/env python3
"""Serve the layered orrery. ES modules need http://, not file://.

Does not install packages. If python3 is missing, install it yourself.
Termux: python3 serve.py   (do not run pkg install from this script)
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

# Map the original FeistTech absolute paths onto shared catalogs/vendors
# so copied apps keep their fetch/import URLs.
ALIASES = {
    "/vendor/d3/d3.v7.min.js": "/shared/vendor/d3/d3.v7.min.js",
    "/vendor/d3/LICENSE": "/shared/vendor/d3/LICENSE",
    "/vendor/topojson-client/topojson-client.min.js": "/shared/vendor/topojson/topojson-client.min.js",
    "/vendor/astronomy-engine/astronomy-engine.min.js": "/shared/vendor/astronomy-engine/astronomy-engine.min.js",
    "/vendor/maplibre-gl-5/maplibre-gl.js": "/shared/vendor/maplibre/maplibre-gl.js",
    "/vendor/maplibre-gl-5/maplibre-gl.css": "/shared/vendor/maplibre/maplibre-gl.css",
    "/vendor/maplibre-gl/maplibre-gl.js": "/shared/vendor/maplibre/maplibre-gl.js",
    "/vendor/maplibre-gl/maplibre-gl.css": "/shared/vendor/maplibre/maplibre-gl.css",
    "/vendor/three/three.module.min.js": "/shared/vendor/three.module.min.js",
    "/vendor/three/three.module.js": "/shared/vendor/three.module.js",
    "/vendor/three/OrbitControls.js": "/shared/vendor/OrbitControls.js",
    "/vendor/satellite-js/satellite.min.js": "/shared/vendor/satellite.min.js",
    "/vendor/world-atlas/land-110m.json": "/shared/vendor/world-atlas/land-110m.json",
    "/vendor/world-atlas/LICENSE": "/shared/vendor/world-atlas/LICENSE",
    "/vendor/d3-celestial/stars.6.json": "/shared/stars/stars.6.json",
    "/vendor/d3-celestial/constellations.lines.json": "/shared/constellations/western-lines.json",
    "/vendor/d3-celestial/constellations.lines.cn.json": "/shared/constellations/chinese-lines.json",
    "/vendor/d3-celestial/constellations.json": "/shared/constellations/western-names.json",
    "/data/eclipses.json": "/shared/eclipses/five-millennium.json",
    "/data/events.json": "/shared/geo/events.json",
    "/site.js": "/stubs/site.js",
    "/portal.js": "/stubs/portal.js",
}

HEAD_HOOK = (
    '<link rel="stylesheet" href="/harness-layer.css">'
    '<script src="/guest-bridge.js"></script>'
)
TAIL_HOOK = ""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean in ALIASES:
            path = ALIASES[clean]
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if path.endswith(".html") and os.path.isfile(path):
            # Inject the adapter into copied pages only, not the harness shell.
            rel = os.path.relpath(path, ROOT)
            if rel.startswith("src" + os.sep):
                data = open(path, "rb").read()
                try:
                    text = data.decode("utf-8")
                except UnicodeDecodeError:
                    return super().send_head()
                if "guest-bridge.js" not in text:
                    low = text.lower()
                    if "</head>" in low:
                        i = low.index("</head>")
                        text = text[:i] + HEAD_HOOK + text[i:]
                    elif "<body" in low:
                        i = low.index("<body")
                        j = text.find(">", i)
                        text = text[: j + 1] + HEAD_HOOK + text[j + 1 :]
                    if "</body>" in text.lower():
                        i = text.lower().rindex("</body>")
                        text = text[:i] + TAIL_HOOK + text[i:]
                data = text.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return None
        return super().send_head()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("Orrery harness at http://127.0.0.1:%s/" % port)
    print("Open that URL in a browser. Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
    finally:
        httpd.server_close()
