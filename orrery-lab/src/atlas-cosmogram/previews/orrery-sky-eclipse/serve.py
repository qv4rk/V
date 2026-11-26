#!/usr/bin/env python3
"""Serve the self-contained Atlas on this device only."""
import functools
import http.server
import pathlib
import shutil
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
try:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
except OSError:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
url = f"http://127.0.0.1:{server.server_port}/"
print(f"Atlas: {url}\nKeep this terminal open. Ctrl+C stops the server.", flush=True)
opener = shutil.which("termux-open-url")
if opener:
    subprocess.Popen([opener, url])
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
