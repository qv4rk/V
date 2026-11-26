# The Atlas: Solar System & Sky

One application, one UTC clock, three views. This update integrates the existing
Scale Orrery and FeistTech Globe & Sky backdrop with an Earth eclipse renderer.
It is hosted on GrokBotPlayground main at the existing preview address:

https://qv4rk.github.io/GrokBotPlayground/atlas-cosmogram/previews/orrery-sky-eclipse/

## Run on your phone

From an extracted copy, run `bash run-termux.sh`. The script opens the local
page using Termux's URL opener when available. Keep Termux running while using it.
All JavaScript, star catalogs and texture files are bundled. After obtaining the
project, runtime does not need an internet connection. Use an HTTP server rather
than Android's file viewer: browser ES modules and catalog fetches require it.

To obtain the current copy straight from GitHub in Termux:

```sh
command -v git >/dev/null || pkg install -y git
command -v python3 >/dev/null || pkg install -y python
git clone --depth 1 --filter=blob:none --sparse https://github.com/qv4rk/GrokBotPlayground.git "$HOME/feisttech-atlas"
git -C "$HOME/feisttech-atlas" sparse-checkout set atlas-cosmogram/previews/orrery-sky-eclipse
cd "$HOME/feisttech-atlas/atlas-cosmogram/previews/orrery-sky-eclipse"
bash run-termux.sh
```

To update that checkout later, run `git -C "$HOME/feisttech-atlas" pull --ff-only`.
The commands never overwrite or reset an existing checkout. If that target
directory already exists, use its checkout or choose a new directory name.

On a computer, run `python3 serve.py` and open the printed localhost URL.

## Views and controls

- Solar system retains the Scale Orrery's orbits, planets, Galilean moons,
  visible/true scales and body focus. Planet positions and axial spins use the
  same Astronomy Engine epoch as the eclipse scene. Small body markers aid finding.
- Earth & shadow uses real Sun/Earth/Moon radii and distances, an oblate WGS84
  Earth, apparent sidereal rotation, a continuous penumbra and total/annular core.
  Cameras include oblique, overhead, Moon, 400 km orbital and shadow alignment.
- Sky uses the actual surface-observer position. The date and latitude/longitude
  controls can freeze a personal sky. Wide sky restores the constellation context;
  Look at Sun narrows the field for the real angular Sun/Moon overlap.
- Western and Chinese constellation figures reuse `V/space/cosmos.js`. Their
  catalog files live beside the app. Both are on by default; the selector switches
  cultures or hides the reference field. Western names use the existing centers.
- Drag to orbit/look; pinch or scroll to zoom. Ctrl + scroll gives finer sky zoom.
  Tap a rendered body or a catalog star to identify it. Save PNG downloads the
  scene and visible constellation names with a transparent background, without UI.
- Four computed eclipse presets cover 1999, 2017, annular 2023 and total 2024.
  The timeline spans two hours either side of the selected event. Arbitrary UTC
  dates remain available through the date input. Ground track follows the selected
  preset, and can be hidden when inspecting another date.

## Mathematical verification

Run `node check.mjs`. Independent NASA RP1398 center-line samples at 10:00,
10:30, 11:00, 11:30 and 12:00 UTC on 1999-08-11 differ by 3.438, 3.014, 3.090,
3.332 and 4.140 km respectively. The check covers disk containment at totality
and annularity, partial overlap, no overlap, the WGS84 intersection, night-side
observers, Earth rotation, and all four event presets.

Browser checks rendered desktop and phone screenshots with software WebGL, with
no JavaScript/shader errors or failed asset requests. They exercised culture
switching, Ctrl + wheel, pinch, Moon tap labels, PNG export and annular geometry.
GPU overlap values were compared to the CPU calculation at five surface points.
The ground footprint's measured axis ratio is 3.71 near the low Sun and 1.16
near greatest eclipse, rather than a fixed circle pasted onto the globe.

The model is an analytical ephemeris visualization, with measured kilometer-scale
ground-track differences above. Lunar limb mountains, Baily's beads, atmospheric
refraction and a historical ISS orbit are not modeled. The smooth corona is an
illustrative optical effect that appears only during calculated totality. The
stellar reference layer stays visible in daylight. Galilean moons and orbital
guide curves retain the original approximate models. The Reading Room and
terrestrial map transition remain in their existing apps; this integration covers
the solar-system, observer-sky and eclipse views.

See [CREDITS.md](./CREDITS.md) for provenance and [EXPORT_FEEDBACK.md](./EXPORT_FEEDBACK.md)
for the brief audit of the supplied chat archive.


## City names, birth charts and book geography (14 October 2026)

The catalog startup failure was caused by calling `.add()` on an HTML optgroup; the repaired picker uses DOM `appendChild`. City search reuses the existing FeistTech GeoNames city database. Birth chart uses the existing tropical/Placidus chart, shown inside the Atlas with an explicit message bridge to its shared clock and observer. Birthplace timezones are inferred from city coordinates, editable, and resolved against IANA rules at the birth date. Repeated DST times require a choice; skipped local times are rejected.

Book mode reuses the 27 canonical chapter records and historical location vertices from `qv4rk/V/data/events.json` and `data/locations/master-vertices.json`. Nodes are attached to the rotating globe; the timeline changes their visibility and brightness. Chapters can be opened in any order in a reading panel while the globe remains interactive. Chapter records that lack a time use noon UTC for display. Book mode uses ambient map lighting to keep geography readable.

The two uploaded eclipse catalogs contain 620 records: 504 from astronomical years 0000–0207 and 116 from 1999–2050. Exact stored eclipse geometry is used at each catalog peak. Chapter, observer, date, camera and birth-chart links are carried through the `/cosmos/` share route.

Verification used real Chromium/SwiftShader desktop and phone rendering, GPU/CPU shadow overlap comparisons, city/state/country lookup, observer share restoration, chapter globe picks and full text, historical daylight saving conversion, ambiguous time handling, and cross-origin natal-chart/Atlas sharing and reopening. No page errors were observed in the integration run.
