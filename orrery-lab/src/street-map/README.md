# Street map (The Atlas)

Color: `#e07a5f`

## Source
- Repository: `qv4rk/V`
- Path: `atlas/index.html`
- Commit SHA: `4a72f1dd328ba9d6acbf853fd532776829fd0700` (recorded 25 Nov 2026, America/New_York, from the local checkout dated `2026-11-24 13:13:01 -0500`)
- Live URL: https://feisttech.com/atlas/
- Stack: MapLibre GL 5, Carto Dark Matter, globe projection
- Plan feature IDs: GEO-01, BOOK-01, APP-02

Verbatim copy of `V/atlas/index.html` in this folder.

## Evidence
- Source: **source present**
- Runtime: **unresolved** (do not treat this README as a fresh verification)

## Camera
Adapter calls the existing MapLibre `jumpTo` (lat/lon/zoom from height, bearing from yaw, pitch). Roll is not supported by MapLibre.

## Features (`setFeature`)
- `app-chrome` — In-app chrome — default off
- `globe-projection` — Globe projection (plan GEO-01) — default on
- `street-tiles` — Street map tiles (plan GEO-01) — default on
- `article-markers` — Article markers (plan BOOK-01) — default on
- `gaza-link` — Gaza damage shortcut (plan GEO-02) — default on

## Notes
Street tiles need a network connection to Carto. Roll is not supported by MapLibre (bearing + pitch only).

The frame URL is `./src/street-map/index.html`.
