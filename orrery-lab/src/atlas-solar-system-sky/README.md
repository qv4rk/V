# The Atlas: Solar System & Sky

Color: `#6ec9e0`

## Source
- Repository: `qv4rk/GrokBotPlayground`
- Path: `atlas-cosmogram/previews/orrery-sky-eclipse/`
- Commit SHA: `ddadc736a6c1bf8910e15f971c94c632083b781c` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-17 12:43:31 -0500`)
- Live URL: https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/previews/orrery-sky-eclipse/
- Stack: Vanilla JS, Three.js r160, Astronomy Engine
- Plan feature IDs: AST-01, AST-03, AST-04, AST-05, ECL-02, ECL-04, SPC-01, SPC-02, SPC-03, SPC-04, BOOK-01, NAT-01, CUL-01, OUT-01

Verbatim copy lives at `src/atlas-cosmogram/previews/orrery-sky-eclipse/` (keeps the preview's relative imports).

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `star-map` — Star map (plan AST-05) — default on
- `outlines-western` — European constellation outlines (plan AST-05) — default on
- `outlines-chinese` — Chinese constellation outlines (plan CUL-01) — default on
- `constellation-labels` — Constellation names (plan AST-05) — default on
- `planet-textures` — Planet and Sun textures (plan AST-01) — default on
- `true-scale` — True scale (off = visible scale) (plan AST-01) — default off
- `galilean-moons` — Galilean moons (plan AST-03) — default on
- `umbra-earth` — Moon umbra / penumbra on Earth (plan ECL-02) — default on
- `shadow-cones` — Shadow cones (alignment view) (plan ECL-02) — default off
- `ground-track` — Eclipse ground track (plan ECL-02) — default on
- `eclipse-catalog` — Eclipse catalog (620-event subset) (plan ECL-04) — default on
- `oumuamua` — ʻOumuamua (plan SPC-01) — default off
- `planet-nine` — Planet Nine (hypothetical) (plan SPC-02) — default off
- `perseids` — Perseid stream (plan SPC-03) — default off
- `satellites` — Satellites (plan SPC-04) — default off
- `book-mode` — Book / chapter geography (plan BOOK-01) — default off

## Notes
https://feisttech.com/cosmos/ (redirect)

The frame URL is `./src/atlas-cosmogram/previews/orrery-sky-eclipse/index.html`.
