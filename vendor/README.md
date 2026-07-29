# vendor/

Local copies of third-party assets this site currently loads from external
CDNs. Nothing in here is code you wrote — it's clearly separated so that's
obvious at a glance.

**Status: staged only.** Nothing in the rest of the repo has been repointed
to these files yet. `Manifold Atlas.html`, `thegreatgaspi/index.html`,
`app/earth.js`, `app/sky.js`, and `index.html` all still call the external
CDNs directly. Use `update_vendor_refs.py` (see below) to switch them over
one at a time.

## What's here, and where it came from

| Path | Source | License | Size |
|---|---|---|---|
| `d3/d3.v7.min.js` | npm `d3@7.9.0`, official registry tarball | ISC | 273KB |
| `topojson-client/topojson-client.min.js` | npm `topojson-client@3.1.0` | ISC | 7KB |
| `maplibre-gl/maplibre-gl.js` + `.css` | npm `maplibre-gl@4.7.1` | BSD-3-Clause | 803KB / 64KB |
| `world-atlas/land-110m.json` | npm `world-atlas@2.0.2` (derived from Natural Earth) | ISC / public domain source data | 54KB |
| `d3-celestial/stars.6.json` + `constellations.lines.json` | Copied from your own existing local clone at `necronomy-atlas/public/d3-celestial/` — not re-downloaded | GPL-3.0 (per that project's LICENSE, also copied here) | 641KB / 26KB |
| `google-fonts/*.woff2` + `fonts.css` | Fetched live from `fonts.googleapis.com` / `fonts.gstatic.com`, latin subset only | SIL Open Font License | ~120KB total |

Everything except the d3-celestial data was pulled through the **npm
registry** (`registry.npmjs.org`), not the CDN mirrors currently in use —
this session's network policy blocks `cdn.jsdelivr.net` and similar package
CDNs outright, but the registry itself is allowed, and it's the same
official published files either way.

Total: a little under 2MB. Comfortably inside GitHub's per-file (100MB) and
per-repo (recommended 5GB) limits — this was never going to be the thing
that used up your storage budget.

## What's deliberately NOT in here yet

A repo-wide check turned up **27 files** referencing these same external
hosts, not just the ones this conversation was about. Most of them use
completely different font families with no local copy yet:

- **`Manifold Atlas.html`** needs a *wider* font set than what's vendored here
  — it also pulls Share Tech Mono and Noto Sans Symbols 2, plus extra
  Cormorant Garamond/Space Mono weights the current `google-fonts/` folder
  doesn't cover. Its D3 and topojson-client calls ARE ready to swap; its
  font call is not.
- **`articles/n01.html` through `n07.html`** use a close-but-not-identical
  Cormorant Garamond/Space Mono weight set (includes 300, which isn't
  vendored here).
- **Every other app** — `eigenstate-roll`, `signature-trends`, the TTS
  readers, `veil-of-babel`, `natal-chart`, `methionine-meal-builder`,
  `solsys`, both `kalidascope` pages — each pulls its own distinct font
  combination (Orbitron, Roboto Mono, Merriweather, Inter, Syne, JetBrains
  Mono). None of that is touched here.
- **A second, apparently older copy of Manifold Atlas** lives at
  `manifold-atlas/` (lowercase, hyphenated — separate from the root-level
  `Manifold Atlas.html` + `app/`). It has its own `earth.js`/`sky.js`/
  `index.html` making the same external calls. Worth confirming whether
  that folder is still live/intentional or safe to remove before it's
  included in any vendoring pass — not assumed either way here.
- **The live map tiles** (CARTO's `basemaps.cartocdn.com` style, and the
  `demotiles.maplibre.org` fallback) are a different kind of dependency
  entirely — not a downloadable file, a live tile-rendering service. That's
  the separate "regional static backup" conversation, not resolved here.

None of the above is in `update_vendor_refs.py`'s list. Getting any of it
vendored would mean downloading more font families and possibly deciding
what to do with the duplicate Manifold Atlas folder first — flagging it
here rather than pretending this pass covers it.

## `update_vendor_refs.py` — how it works

Run it from the repo root:

```
python3 vendor/update_vendor_refs.py
```

Each run does **at most one** change:

1. It checks a fixed, ordered list of tasks from the top.
2. Any task whose file already points at the local `vendor/` copy is
   already done — skipped silently, move to the next.
3. The first task that's still pointing at the external CDN gets applied,
   and the script stops right there and prints exactly which one it did.
4. It will not touch a second task in the same run, even if the first one
   succeeds.

The intended loop: run it once, go check the live site didn't break,
come back and run it again for the next item, repeat until it reports
nothing is left.

Current task list (7 items, in the order they'll be applied):

1. `index.html` — Google Fonts link → `vendor/google-fonts/fonts.css`
2. `Manifold Atlas.html` — D3.js → `vendor/d3/d3.v7.min.js`
3. `Manifold Atlas.html` — topojson-client → `vendor/topojson-client/topojson-client.min.js`
4. `app/earth.js` — world-atlas coastline URL → `vendor/world-atlas/land-110m.json`
5. `app/sky.js` — d3-celestial CDN constant → `vendor/d3-celestial/`
6. `thegreatgaspi/index.html` — MapLibre GL CSS → `vendor/maplibre-gl/maplibre-gl.css`
7. `thegreatgaspi/index.html` — MapLibre GL JS → `vendor/maplibre-gl/maplibre-gl.js`

If a file's content has changed since this script was written and neither
the old nor the new text can be found, it stops and warns instead of
guessing — it won't silently skip a task it can't verify.
