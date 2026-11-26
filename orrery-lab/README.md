# Orrery layer harness

A first-pass **comparison harness** for the Atlas consolidation plan (*Atlas: unified application and frozen birth-chart export*, 23 October 2026). It is not the finished unified Maps app and it does **not** replace any working public entry point (especially `https://feisttech.com/orrery/`).

Published (when copied into `qv4rk/V`) as a new folder: **https://feisttech.com/orrery-lab/**. Do not put this tree at `V/orrery/`.

Copied apps stay as they were. An integration adapter (`guest-bridge.js`, injected only when this server serves `src/` pages) gives them a shared clock, a shared camera, feature toggles, pick/tags, and shared catalog paths. Orbit, ephemeris, eclipse, and natal math are not reimplemented here.

## Run

ES modules will not load from `file://`.

The tree is static-ready for GitHub Pages: each copied app entry has `guest-bridge.js` in the HTML (unmodified originals are saved beside them as `original.html`). Root `/vendor/` and `/data/` URLs are rewritten to relative `shared/` paths in those entries, and `guest-bridge.js` also rewrites `fetch` / XHR so Pages does not need `serve.py`. Compatibility copies (not symlinks) are used under `shared/vendor/` because Pages does not follow symlinks reliably.

```sh
python3 serve.py
# then open http://127.0.0.1:8765/
```

A plain `python3 -m http.server` from this folder also works. Termux: `sh run-termux.sh`. That script **does not install packages**. If `python3` is missing, install it yourself; the script will only report the gap.

## How to use it

- Turn any number of versions **on at once**. They stack as transparent layers (overlapping Earths are intended).
- Per-layer **opacity** and **feature toggles** are in the menu. State is saved in `localStorage` under `feisttech.orrery.layer-state/1`.
- **One shared camera** on the top overlay (Google Earth–style): one-finger / left-drag orbit; pinch or wheel zoom, continuously down toward street level where a MapLibre layer is on; two-finger twist roll; two-finger / right-drag pan; three-finger vertical or Shift-drag tilt; Ctrl-drag roll; double-tap zoom toward the point; **Reset view** restores the default. On a phone the menu starts collapsed so the map can be dragged. If a layer cannot follow the shared camera, use **Drive** in the menu to hand input to that layer's own controls.
- **Single tap** asks every visible layer to pick what is under the point and draws a **color-coded name tag** per layer (see the color key). Tap empty space to hide tags.
- **Shared clock** sends one UTC instant to layers that implement `setTime`.
- **Debug report** downloads a JSON file and copies it to the clipboard.

## Debug report format

`format` is `feisttech.orrery.debug-report/1`. Fields:

- `timestamp` — ISO 8601 (also interpreted for the user in America/New_York)
- `timezone` — `America/New_York`
- `device` — user agent, platform, language, touch, maxTouchPoints, viewport, pixelRatio
- `camera` — shared camera state (lat, lon, heightKm, yaw, pitch, roll, fov)
- `time` — shared clock ISO string
- `tagColors` — `{ [versionId]: { title, color } }`
- `visibleLayers` — ids currently on
- `versions[]` — for **every** version: source repo/path/SHA, stack, camera class, plan IDs, evidence, `visible`, `opacity`, every feature `{ id, label, on, planId }`, recent `errors`
- `cultures[]` — cultural-sky entries and whether they have sourced figure data in this pass
- `accountedButNotMounted` — plan sources that are inventoried but not a camera layer (kaleidoscope, FeistTech `/orrery/` shell, necronomy, research prompts, redirects)
- `hostErrors`, `repos`

Use a report after setting the mix you want kept in the later merged app.

## Mapping to the 23 Oct 2026 plan feature IDs

This harness is the plan’s baseline comparison tool (Phase A), not Phase F export or PAY-01 checkout. Those are not built here.

| ID | In this pass |
|---|---|
| AST-01 | Scale Orrery proposal, Atlas preview, Space, early stub, solsys |
| AST-02, AST-03 | Moon and Galilean moons in the proposal / preview (existing math) |
| AST-04, AST-05 | Globe & Sky and Atlas preview observer sky, stars, labels |
| ECL-01 | Shared `five-millennium.json` (23,992 events, 2000 BCE–3000 CE), used by Globe & Sky, Space, Solar Experience |
| ECL-02, ECL-03 | Preview Earth shader / Space umbra cones (existing geometry); Globe & Sky uses illustrated circles |
| SPC-01…04 | ʻOumuamua, Planet Nine (hypothetical), Perseids, satellites — existing overlays, toggleable |
| SPC-05…08 | Missions, launch, fields, Lagrange — **not in this pass** (plan requirements, still unfinished) |
| GEO-01, GEO-02 | Street map (MapLibre) and Gaza damage layer |
| BOOK-01, BOOK-02 | Chapter nodes / book tools where the copied app already has them |
| DIAL-01 | Globe & Sky Antikythera-style dial (the rich `V/app/dial.js`, not only the Cosmogram stepper) |
| NAT-01, NAT-02 | **Natal chart** app (`V/apps/webapps/natal-chart/`) holds the astronomy-engine birth-chart math |
| CUL-01 | European and Chinese figures from d3-celestial (see Cultural skies) |
| KAL-01 | Kaleidoscope is **not mounted and not modified**; previous-touch behavior is left intact |
| OUT-01 | Existing PNG/PDF/share controls remain inside their apps (Eigenstate PDF, Atlas PNG) |
| OUT-02, PAY-01 | Frozen birth export and checkout — **not built here** |
| APP-01, APP-02 | Homepage four destinations and the continuous Maps journey are the later product, not this harness |

## Cultural skies (CUL-01)

**Drawn in this pass:**

- European / IAU constellation lines — [d3-celestial](https://github.com/ofrohn/d3-celestial) by [Olaf Frohn](https://github.com/ofrohn), BSD-3-Clause, inside the copied apps
- Chinese 三垣二十八宿 — the same catalog’s traditional Chinese figures, inside those apps
- Arabic anwāʾ (الأنواء) — host overlay from vendored Stellarium `arabic_lunar_stations` (**AGPL-3.0**)
- Indian nakshatras (नक्षत्र) — host overlay from vendored Stellarium `indian` (**AGPL-3.0**)
- Māori Tātai Arorangi — host overlay from vendored Stellarium `maori` (**AGPL-3.0**)

Toggles in the **Cultural skies** menu group turn those on or off. Stellarium-derived lines are in `shared/cultures/stellarium-figures.json` (also AGPL-3.0).

**Vendored but not wired (research text / next step; nothing invented):**

- Hawaiian Polynesian star lines (`hawaiian_starlines`)
- Inca / Quechua — Mayu, yana phuyu, Qullqa as dust-lane outlines (`northern_andes` is the closest pack; the dark-lane set may be incomplete)
- Aboriginal Australian — Emu in the Sky (`boorong`, `kamilaroi`; not a stand-in for every tradition)
- Navajo / Diné (`navajo`)

Dunhuang and Suzhou maps are cited in the research file; they are not imported as geometry here. Military and intelligence questions in that file are ignored.

## Camera follow (and where it cannot)

| Class | Versions | Follows |
|---|---|---|
| `three-earth` | Atlas preview, Scale Orrery, early stub, Cosmogram, Space, Solar Experience (if built) | Guest-bridge hooks `renderer.render` and re-applies the shared camera every frame (OrbitControls would otherwise overwrite it). Native controls stay off unless **Drive** is set to that layer. Solar Experience still needs its Vite build. |
| `maplibre` | Street map, Gaza damage | lat/lon/height → zoom, yaw → bearing, pitch → tilt. **No roll** |
| `partial-2d` | Globe & Sky, solsys | Globe rotation follows lon+yaw / lat+pitch and zoom follows height; solsys pan/zoom follows the same state. |
| `none` | Natal chart, Eigenstate | No shared 3D camera — use **Drive: &lt;layer&gt;** so the app’s own UI receives input. |

Several WebGL layers at once may hit the browser’s context limit. If a layer goes black, turn others off and note it in a debug report.

## Eigenstate

The user asked for Eigenstate (typed “eigendtate”). The live app is `qv4rk/V/apps/webapps/eigenstate-roll/` (`https://feisttech.com/eigenstate/`). It is a **dicemancy oracle** (six dice, interpretive 12-house die, PDF/share export), not the astronomy-engine natal calculator. Birth-chart math is in `apps/webapps/natal-chart/` (also a layer). Commercial export/checkout is not built here.

## Inventory notes

Plan section 2 is the starting source list. Also included from a later search, and marked as discovered: `solsys` and `solar-experience-live`. Routing wrappers (`/cosmos/`, `/manifold-atlas/`, shortlinks, space-hub) are not separate versions. SHAs were recorded from local checkouts on 25 Nov 2026 (America/New_York):

- `qv4rk/GrokBotPlayground` `ddadc736a6c1bf8910e15f971c94c632083b781c` (17 Nov 2026, 12:43 PM)
- `qv4rk/V` `4a72f1dd328ba9d6acbf853fd532776829fd0700` (24 Nov 2026, 1:13 PM), from the newest local V checkout
- `qv4rk/solar-experience-live` `8235dd3d6de0bde2e7aa30ffec373dbd2a99c300` (10 Nov 2026, 9:57 AM)

This tree is published in `qv4rk/V` as **`orrery-lab/`** (https://feisttech.com/orrery-lab/). The working Scale Orrery entry at `V/orrery/` / https://feisttech.com/orrery/ is left untouched. Do not force-push or overwrite existing files.

## Evidence language

Per the plan: **source present**, **runtime verified**, or **unresolved**. This README and the per-app READMEs describe what is in the tree (**source present**). Browser behavior is **unresolved** until a run is actually checked. Do not treat a README sentence as a fresh verification.


## Vendored sources

GitHub data sources and libraries used by this tree are copied into `shared/vendor/<repo-name>/` (shallow / needed files, or the full tree when it is a reasonable size). There are **no git submodules**. Each folder keeps the upstream LICENSE and a README with the author, repository URL, and the commit SHA that was copied. Compatibility symlinks at the older flattened paths keep the verbatim apps loading.

If this tree is ever copied into `qv4rk/V`, these folders belong at `orrery/shared/vendor/<repo-name>/` beside the harness, **not** as a replacement for the working `V/orrery/` Scale Orrery entry.

| Vendored folder | Author | Repository | License | Commit SHA (copied) |
|---|---|---|---|---|
| `shared/vendor/three.js/` | [Ricardo Cabello (mrdoob)](https://github.com/mrdoob) and [contributors](https://github.com/mrdoob/three.js/graphs/contributors) | [mrdoob/three.js](https://github.com/mrdoob/three.js) r160 | MIT | `d04539a76736ff500cae883d6a38b3dd8643c548` (22 Dec 2023, 7:31 AM America/New_York) |
| `shared/vendor/astronomy/` | [Don Cross (cosinekitty)](https://github.com/cosinekitty) | [cosinekitty/astronomy](https://github.com/cosinekitty/astronomy) v2.1.19 | MIT | `61dc07020aaa6885d2c7f688a4d82beaf6edb9ef` (14 Dec 2023, 12:48 PM America/New_York) |
| `shared/vendor/d3/` | [Mike Bostock (mbostock)](https://github.com/mbostock) and [D3 contributors](https://github.com/d3/d3/graphs/contributors) | [d3/d3](https://github.com/d3/d3) v7.9.0 | ISC | `1f8dd3b92960f58726006532c11e9457864513ec` (12 Mar 2024, 6:14 PM America/New_York) |
| `shared/vendor/maplibre-gl-js/` | [MapLibre](https://github.com/maplibre) contributors | [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) v5.9.0 | BSD-style | `14f56b00e0f08784681ef98f0731c60f3923a4a9` (9 Oct 2025, 7:41 AM America/New_York) |
| `shared/vendor/satellite-js/` | [Shashwat Kandadai (shashwatak)](https://github.com/shashwatak) and UCSC | [shashwatak/satellite-js](https://github.com/shashwatak/satellite-js) 5.0.0 | MIT | `8a6aada761d41b2dafd3c627fbe265a031d45579` (6 Jan 2023, 6:43 AM America/New_York) |
| `shared/vendor/topojson-client/` | [Mike Bostock (mbostock)](https://github.com/mbostock) / [TopoJSON](https://github.com/topojson) | [topojson/topojson-client](https://github.com/topojson/topojson-client) | ISC | `71e5bd6428fd8b7a40fa980d2ef7862140851f03` (5 Nov 2019, 10:44 PM America/New_York) |
| `shared/vendor/world-atlas/` | [Mike Bostock](https://github.com/mbostock) / [TopoJSON](https://github.com/topojson); land from [Natural Earth](https://www.naturalearthdata.com/) | [topojson/world-atlas](https://github.com/topojson/world-atlas) | ISC | `a912c0a22c3fbd1979cb6defdd6389d8c35e7c2a` (5 Sep 2019, 1:16 PM America/New_York) |
| `shared/vendor/d3-celestial/` | [Olaf Frohn (ofrohn)](https://github.com/ofrohn) | [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial) | BSD-3-Clause | `7e720a3de062059d4c5400a379146a601d9010e0` (5 Jul 2022, 2:03 PM America/New_York) |
| `shared/vendor/stellarium-skycultures/` | [Stellarium](https://github.com/Stellarium) and the contributors named in each culture’s `index.json` | [Stellarium/stellarium-skycultures](https://github.com/Stellarium/stellarium-skycultures) (needed cultures only) | **AGPL-3.0** | `2d80ce70984c14bba7da2d31a0f9b27e292861c9` (2 Nov 2026, 3:19 PM America/New_York) |

**Share-alike:** the Stellarium skyculture files are AGPL-3.0 and are **not relicensed** by being placed here. Conveying a modified version, or running a modified network service that includes them, may require offering corresponding source under AGPL-3.0. Other vendors keep their own MIT / BSD / ISC terms. The main Stellarium application repo (GPL-2.0, huge) is not vendored.

**Not GitHub-first (credited, not given a repo SHA):**

- Planet / sun maps — [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0; Earth NASA Blue Marble; Moon NASA LROC. See `shared/textures/README.md`. Unofficial GitHub mirrors are not vendored.
- Eclipse catalog `shared/eclipses/five-millennium.json` — generated with Astronomy Engine (`V/tools/build_eclipses.js`); **not** a copy of the NASA Five Millennium Canon and not a NASA GitHub dump. Astronomy Engine itself is vendored above.

## Layout

```
orrery/
  index.html          # single page, layer menu, shared overlay
  app.js              # menu, state, tags, debug report
  camera-controller.js
  guest-bridge.js     # adapter injected into copied apps
  serve.py
  shared/             # catalogs, textures, licenses, cultures
  shared/vendor/<repo>/  # vendored GitHub sources (LICENSE + SHA README)
  src/<app>/original.html  # unmodified entry HTML (Pages gets the hooked copy)
  src/<app>/          # verbatim copies + README (frame may live under src/atlas-cosmogram/…)
```
