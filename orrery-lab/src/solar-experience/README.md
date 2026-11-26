# Solar Experience (React)

Color: `#e8a0bf`

## Source
- Repository: `qv4rk/solar-experience-live`
- Path: `src/ (static GitHub Pages port of qv4rk/solar_exprrience)`
- Commit SHA: `8235dd3d6de0bde2e7aa30ffec373dbd2a99c300` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-10 09:57:19 -0500`)
- Live URL: https://qv4rk.github.io/solar-experience-live/
- Stack: React 19, React Three Fiber, Three.js, astronomy-engine, Zustand
- Plan feature IDs: AST-01, ECL-01, ECL-02, NAT-02, SPC-01, SPC-02

Verbatim copy of `qv4rk/solar-experience-live` (git metadata omitted). Needs a Vite build to run; runtime is unresolved until then.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter tries to drive the existing Three.js camera around Earth (`setCamera`). OrbitControls are disabled when found. Evidence: source present; runtime unresolved until exercised in a browser.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `opaque-background` — Opaque background — default off
- `planet-textures` — Procedural planet textures — default on
- `orbits` — Orbits — default on
- `zodiac` — Zodiac belt (not IAU/Chinese figures) — default on
- `umbra-earth` — Solar umbra shader on Earth (plan ECL-02) — default on
- `eclipse-catalog-5k` — 5,001-year eclipse catalog (plan ECL-01) — default on
- `oumuamua` — ʻOumuamua (plan SPC-01) — default off
- `planet-nine` — Planet Nine (hypothetical) (plan SPC-02) — default off

## Notes
Discovered in search; not in the 23 Oct plan section 2 list. Uses the same 23,992-event catalog as V/data/eclipses.json. Textures are procedural, not photographic. Needs a built bundle to run in this harness (runtime unresolved until the build is present).

The frame URL is `./src/solar-experience/index.html`.
