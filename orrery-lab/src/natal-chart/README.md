# Natal chart

Color: `#d4a0e0`

## Source
- Repository: `qv4rk/V`
- Path: `apps/webapps/natal-chart/`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/natal/
- Stack: Vanilla JS, astronomy-engine, Placidus houses, d3-celestial map
- Plan feature IDs: NAT-01, NAT-02, OUT-01

Verbatim copy of `V/apps/webapps/natal-chart/` in this folder. This is where the astronomy-engine birth-chart math lives.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Cannot follow the shared 3D camera. Feature toggles and (where wired) `setTime` still apply.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default on
- `chart-wheel` — Chart wheel (plan NAT-02) — default on
- `houses` — Placidus houses (plan NAT-02) — default on
- `celestial-map` — Celestial map — default on

## Notes
Cannot follow the shared 3D camera (2D chart wheel / sky map). Time and place can still receive setTime when wired.

The frame URL is `./src/natal-chart/index.html`.
