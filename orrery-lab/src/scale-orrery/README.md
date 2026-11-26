# Scale Orrery (proposal)

Color: `#e0b85a`

## Source
- Repository: `qv4rk/GrokBotPlayground`
- Path: `atlas-cosmogram/proposals/scale-orrery/`
- Commit SHA: `ddadc736a6c1bf8910e15f971c94c632083b781c` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-17 12:43:31 -0500`)
- Live URL: https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/proposals/scale-orrery/
- Stack: Vanilla JS, Three.js r160, JPL Kepler elements, Meeus Moon
- Plan feature IDs: AST-01, AST-02, AST-03

Verbatim copy lives at `src/atlas-cosmogram/proposals/scale-orrery/` (uses `../../js` from the copied cosmogram tree).

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `planet-textures` — Planet textures (plan AST-01) — default on
- `true-scale` — True scale (off = visible scale) (plan AST-01) — default off
- `moon` — The Moon (plan AST-02) — default on
- `galilean-moons` — Galilean moons (plan AST-03) — default on
- `orbit-guides` — Orbit guides (plan AST-01) — default on
- `eclipse-presets` — Eclipse date presets (small catalog) — default on

## Notes
https://feisttech.com/orrery/ is a FeistTech shell that imports this module (entry point, not a separate engine). Do not replace that URL.

The frame URL is `./src/atlas-cosmogram/proposals/scale-orrery/index.html`.
