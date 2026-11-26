# Scale Orrery (early five-planet stub)

Color: `#d07a38`

## Source
- Repository: `qv4rk/GrokBotPlayground`
- Path: `scale-orrery/`
- Commit SHA: `ddadc736a6c1bf8910e15f971c94c632083b781c` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-17 12:43:31 -0500`)
- Live URL: https://qv4rk.github.io/GrokBotPlayground/scale-orrery/
- Stack: Single-file Three.js, Kepler J2000 elements
- Plan feature IDs: AST-01

Verbatim copy of `GrokBotPlayground/scale-orrery/` in this folder.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `planet-textures` — Planet textures — default on
- `true-scale` — True-scale toggle (still approximate in this stub) (plan AST-01) — default off

## Notes
Plan section 2: additional earlier version to compare rather than silently ignore. Known limits: five planets, imperfect true scale, unstoppable clock, broken original texture URLs (this copy uses shared textures).

The frame URL is `./src/scale-orrery-early/index.html`.
