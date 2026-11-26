# Space (system, shadows, phenomena)

Color: `#9b8cff`

## Source
- Repository: `qv4rk/V`
- Path: `space/`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/space/
- Stack: Vanilla JS, Three.js, Astronomy Engine, satellite.js
- Plan feature IDs: AST-01, AST-05, ECL-02, ECL-03, SPC-01, SPC-02, SPC-03, SPC-04, CUL-01

Verbatim copy of `V/space/` in this folder.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `star-map` — Star map (plan AST-05) — default on
- `outlines-western` — European constellation outlines (plan CUL-01) — default on
- `outlines-chinese` — Chinese constellation outlines (plan CUL-01) — default on
- `planet-textures` — Generated planet textures / Earth continents — default on
- `umbra-earth` — Moon umbra / penumbra cones on Earth (plan ECL-02) — default on
- `umbra-moon` — Earth umbra / penumbra on the Moon (plan ECL-03) — default on
- `eclipse-catalog-5k` — 5,001-year eclipse catalog (plan ECL-01) — default on
- `oumuamua` — ʻOumuamua view (plan SPC-01) — default off
- `planet-nine` — Planet Nine view (hypothetical) (plan SPC-02) — default off
- `perseids` — Perseid Earth-crossing view (plan SPC-03) — default off
- `satellites` — Satellites view (plan SPC-04) — default off

## Notes
Existing calculations are reused as-is. The harness only injects guest-bridge.js and harness-layer.css when serving.

The frame URL is `./src/space/index.html`.
