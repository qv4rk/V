# Atlas & Cosmogram (original)

Color: `#5cbc9a`

## Source
- Repository: `qv4rk/GrokBotPlayground`
- Path: `atlas-cosmogram/`
- Commit SHA: `ddadc736a6c1bf8910e15f971c94c632083b781c` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-17 12:43:31 -0500`)
- Live URL: https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/
- Stack: Vanilla JS, Three.js, dual camera, natal freeze, reading panel
- Plan feature IDs: AST-01, AST-04, NAT-03, BOOK-02, DIAL-02

Verbatim copy of `GrokBotPlayground/atlas-cosmogram/` in `src/atlas-cosmogram/`.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `observer-camera` — Observer camera (plan AST-04) — default off
- `natal-freeze` — Natal freeze (plan NAT-03) — default off
- `article-nodes` — Globe article nodes (plan BOOK-02) — default on
- `historical-eclipses` — 18 historical eclipse presets (NASA 5MCSE notes) — default on

## Notes
The Cosmogram TimeDial is the basic Julian Day stepper (DIAL-02 mentions it is distinct from V/app/dial.js).

The frame URL is `./src/atlas-cosmogram/index.html`.
