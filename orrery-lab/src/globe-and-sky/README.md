# Globe & Sky (Manifold Atlas)

Color: `#8fbf6a`

## Source
- Repository: `qv4rk/V`
- Path: `Manifold Atlas.html + app/`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/sky/
- Stack: Canvas 2D, D3, Astronomy Engine, Antikythera SVG dial
- Plan feature IDs: AST-04, AST-05, ECL-01, ECL-02, DIAL-01, CUL-01, BOOK-01, SKIN-01

Verbatim copy of `V/Manifold Atlas.html` plus `V/app/`, with `events.json` at `data/events.json` so the existing relative fetch works.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Shared camera is only partly applicable (pan/zoom or globe lat/lon). Pitch/roll may be ignored.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `star-map` — Star map (plan AST-05) — default on
- `outlines-western` — European constellation outlines (plan AST-05) — default on
- `outlines-chinese` — Chinese constellation outlines (plan CUL-01) — default on
- `constellation-labels` — Constellation names — default on
- `eclipse-catalog-5k` — 5,001-year eclipse catalog (23,992 events) (plan ECL-01) — default on
- `umbra-earth` — Illustrated solar shadow on the globe (plan ECL-02) — default on
- `date-dial` — Antikythera-style dial (plan DIAL-01) — default on
- `article-nodes` — Article nodes (plan BOOK-01) — default on

## Notes
Public /sky/ loads Manifold Atlas.html (the app). /manifold-atlas/ is a redirect wrapper, not a separate version. Solar umbra on the globe is illustrated circles, not the WGS84 shader.

The frame URL is `./src/globe-and-sky/Manifold Atlas.html`.
