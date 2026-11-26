# Eigenstate Roll

Color: `#c9a84c`

## Source
- Repository: `qv4rk/V`
- Path: `apps/webapps/eigenstate-roll/  (shortlink: /eigenstate/)`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/eigenstate/
- Stack: Vanilla JS, canvas starfield, six-dice ritual, PDF export
- Plan feature IDs: OUT-01

Verbatim copy of `V/apps/webapps/eigenstate-roll/`. Public shortlink: `/eigenstate/` → this app. Eigenstate Roll is a dicemancy oracle with PDF/share export, not the natal-chart calculator.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Cannot follow the shared 3D camera. Feature toggles and (where wired) `setTime` still apply.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default on
- `starfield` — Starfield background — default on
- `dice-ritual` — Six-dice ritual — default on
- `pdf-export` — PDF export button (plan OUT-01) — default on

## Notes
Requested as the birth-chart/export app (typed 'eigendtate'). The code at this path is a quantum dicemancy oracle with a 12-house die and PDF/share export, not the astronomy-engine natal calculator. Birth-chart math is in apps/webapps/natal-chart/ (also a layer here) and in the Atlas natal-freeze/birth-chart frame. This harness does not build the commercial checkout. Camera: cannot follow the shared 3D camera.

The frame URL is `./src/eigenstate/index.html`.
