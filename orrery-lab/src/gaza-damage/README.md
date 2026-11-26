# Gaza City · Damage Over Time

Color: `#c44c4c`

## Source
- Repository: `qv4rk/V`
- Path: `gaza-damage/`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/gaza-damage/
- Stack: MapLibre GL, UNOSAT/OSM footprints, assessment-date playback
- Plan feature IDs: GEO-02

Verbatim copy of `V/gaza-damage/` (including `data/`) in this folder.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter calls the existing MapLibre `jumpTo` (lat/lon/zoom from height, bearing from yaw, pitch). Roll is not supported by MapLibre.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `street-tiles` — Base map tiles — default on
- `damage-footprints` — Damage footprints (plan GEO-02) — default on
- `height-encoding` — Height encoding by damage class (plan GEO-02) — default on
- `date-playback` — Assessment-date playback / dial (plan GEO-02) — default on

## Notes
Listed in the 23 Oct plan section 2. Tiles and some styles need the network. Roll not supported.

The frame URL is `./src/gaza-damage/index.html`.
