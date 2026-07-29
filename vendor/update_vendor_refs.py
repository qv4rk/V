#!/usr/bin/env python3
"""
Incrementally repoint the site's code from external CDN calls to the local
copies in vendor/ — one change at a time, never more.

Usage:
    python3 vendor/update_vendor_refs.py

Behavior, exactly as specified:
  - Walks the TASKS list below, in order, from the top every time it runs.
  - For each task: if the file no longer contains the old (external) text,
    that task is already done — skip to the next one, silently.
  - The first task that is NOT yet done gets applied, and the script STOPS
    immediately and prints which one it did. It does not move on to the
    next task in the same run.
  - Run it again to apply the next one. Re-running after everything is
    done just reports that nothing is left.

This only ever touches ONE line-level change per run, so there is always
exactly one thing to check on the live site before running it again.

Scope: only tasks with a verified, already-downloaded local file in
vendor/ are listed here. Anything found elsewhere in the repo that calls
these same external hosts but doesn't have a matching local asset yet
(Manifold Atlas's extra font families, the article pages, every other
app's unrelated fonts, the live map tile service) is deliberately left
out — see vendor/README.md for the full accounting of what that is and
why it's not in this list yet.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # repo root

TASKS = [
    {
        "label": "index.html — Google Fonts (Cinzel/Cormorant Garamond/Space Mono) -> vendor/google-fonts/fonts.css",
        "file": "index.html",
        "old": (
            '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700'
            '&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400'
            '&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">'
        ),
        "new": '<link href="vendor/google-fonts/fonts.css" rel="stylesheet">',
    },
    {
        "label": "Manifold Atlas.html — D3.js -> vendor/d3/d3.v7.min.js",
        "file": "Manifold Atlas.html",
        "old": '<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>',
        "new": '<script src="vendor/d3/d3.v7.min.js"></script>',
    },
    {
        "label": "Manifold Atlas.html — topojson-client -> vendor/topojson-client/topojson-client.min.js",
        "file": "Manifold Atlas.html",
        "old": '<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>',
        "new": '<script src="vendor/topojson-client/topojson-client.min.js"></script>',
    },
    {
        "label": "app/earth.js — world-atlas coastlines -> vendor/world-atlas/land-110m.json",
        "file": "app/earth.js",
        "old": "const COASTLINE_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';",
        "new": "const COASTLINE_URL = 'vendor/world-atlas/land-110m.json';",
    },
    {
        "label": "app/sky.js — d3-celestial star/constellation data -> vendor/d3-celestial/",
        "file": "app/sky.js",
        "old": "const CDN = 'https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data/';",
        "new": "const CDN = 'vendor/d3-celestial/';",
    },
    {
        "label": "thegreatgaspi/index.html — MapLibre GL CSS -> vendor/maplibre-gl/maplibre-gl.css",
        "file": "thegreatgaspi/index.html",
        "old": '<link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet">',
        "new": '<link href="../vendor/maplibre-gl/maplibre-gl.css" rel="stylesheet">',
    },
    {
        "label": "thegreatgaspi/index.html — MapLibre GL JS -> vendor/maplibre-gl/maplibre-gl.js",
        "file": "thegreatgaspi/index.html",
        "old": '<script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>',
        "new": '<script src="../vendor/maplibre-gl/maplibre-gl.js"></script>',
    },
]


def main():
    for i, task in enumerate(TASKS, start=1):
        path = ROOT / task["file"]
        if not path.exists():
            print(f"[{i}/{len(TASKS)}] SKIP — file not found: {task['file']}")
            continue

        text = path.read_text(encoding="utf-8")

        if task["old"] not in text:
            if task["new"] in text:
                # Already updated on a previous run — move to the next task.
                continue
            print(f"[{i}/{len(TASKS)}] WARNING — neither the old nor the new "
                  f"text was found in {task['file']}. File may have changed "
                  f"since this script was written. Nothing changed. Stopping.")
            print(f"    {task['label']}")
            sys.exit(1)

        # This is the first not-yet-done task. Apply it and stop.
        updated = text.replace(task["old"], task["new"], 1)
        path.write_text(updated, encoding="utf-8")
        print(f"[{i}/{len(TASKS)}] DONE — {task['label']}")
        print(f"    File updated: {task['file']}")
        print("    Check the live site now. Run this script again for the next item.")
        return

    print("Nothing left to update — all listed tasks are already pointing at vendor/.")


if __name__ == "__main__":
    main()
