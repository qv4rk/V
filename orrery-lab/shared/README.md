# Shared data

Used by the comparison harness so copied apps can keep their original fetch/import paths (rewritten at serve time) without a second copy of every catalog.

| Path | What | License / credit |
|---|---|---|
| `eclipses/five-millennium.json` | 23,992 solar + lunar eclipses, 2000 BCE–3000 CE, built with Astronomy Engine (`V/tools/build_eclipses.js`) | Same method as the natal chart; not the NASA Five Millennium Canon itself |
| `eclipses/atlas-geometry-catalog.json` | 620 events with stored geometry (years 0000–0207 and 1999–2050) from the Atlas preview | Preview provenance in that app's CREDITS |
| `eclipses/historical-presets.json` | 18 named historical presets (notes cite NASA 5MCSE) | See cosmogram file comments |
| `stars/stars.6.json` | 5,044 stars, mag ≤ 6, from d3-celestial / XHIP (Hipparcos) | BSD-3-Clause, Olaf Frohn / d3-celestial |
| `constellations/western-lines.json` | 89 IAU / European figures | BSD-3-Clause, d3-celestial |
| `constellations/chinese-lines.json` | 312 traditional Chinese figures | BSD-3-Clause, d3-celestial |
| `constellations/western-names.json` | Western constellation names (includes Chinese name fields where present) | BSD-3-Clause, d3-celestial |
| `textures/` | Sun and planet maps (Solar System Scope, resized); Earth Blue Marble; lunar LROC via globe.gl examples | CC BY 4.0 Solar System Scope; NASA Blue Marble / LROC — **not** a GitHub-first source; see `textures/README.md` |
| `geo/land-110m.json` | Natural Earth 110m land (also vendored under `vendor/world-atlas/`) | ISC, [topojson/world-atlas](https://github.com/topojson/world-atlas) / [Natural Earth](https://www.naturalearthdata.com/) |
| `geo/events.json` | Canonical chapter/article records from `V/data/events.json` | Project content |
| `stars/`, `constellations/` | Copies already used by the apps (d3-celestial data) | BSD-3-Clause; official tree also at `vendor/d3-celestial/data/` |
| `licenses/` | Convenience copies of vendor license texts | Canonical files are in `vendor/<repo>/` |
| `vendor/<repo-name>/` | GitHub libraries and catalogs, each with LICENSE + SHA README | See `vendor/README.md` and the root `orrery/README.md` list |

Evidence: **source present** in the local checkouts. Do not treat this file as runtime verification of every fetch.

## Vendored GitHub sources

See `vendor/README.md` for the author / URL / SHA table. Highlights:

- Libraries: [three.js](https://github.com/mrdoob/three.js) ([mrdoob](https://github.com/mrdoob)), [astronomy](https://github.com/cosinekitty/astronomy) ([Don Cross](https://github.com/cosinekitty)), [d3](https://github.com/d3/d3) ([Mike Bostock](https://github.com/mbostock)), [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js), [satellite-js](https://github.com/shashwatak/satellite-js) ([Shashwat Kandadai](https://github.com/shashwatak)), [topojson-client](https://github.com/topojson/topojson-client) and [world-atlas](https://github.com/topojson/world-atlas).
- Star catalogs and figures: [d3-celestial](https://github.com/ofrohn/d3-celestial) ([Olaf Frohn](https://github.com/ofrohn)), BSD-3-Clause.
- Cultural skies for the next drawing pass: [stellarium-skycultures](https://github.com/Stellarium/stellarium-skycultures), **AGPL-3.0** (share-alike; not relicensed). Needed cultures only; the main Stellarium app is not vendored.

The 23,992-event eclipse file is generated with Astronomy Engine, not taken from a NASA GitHub repository.
