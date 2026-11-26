# Atlas & Cosmogram Source Map: Missions, Fields, Moon, Eclipses, Antikythera

Date: 2026-10-03
Contributor: CHATGPT
Scope: discoveries from the Atlas/Cosmogram planning chat, organized so the scale orrery and Earth/Moon layers can be built from real public sources.

This note is a contribution map, not final code. It gathers the links, why each matters, and the suggested way to use it in the playground.

## Build Direction

The Atlas/Cosmogram should keep one shared time stem: Julian Day from the Antikythera dial. That same time value should drive:

- Earth rotation.
- Moon position and orientation.
- Sun position.
- Eclipse geometry and shadow cones.
- Mission playback.
- Spacecraft launch events.
- Earth magnetic field / radiation belt visibility.
- Ancient-cycle Antikythera readouts.
- Modern ephemeris checks.

The user-facing experience should show the thing happening. Source labels and provenance can live in an info panel or credits drawer.

## Real Mission Trajectories

### NASA NAIF SPICE data hub

URL:
https://naif.jpl.nasa.gov/naif/data.html

Reason:
NASA NAIF is the main SPICE source. SPICE kernels are the right source family for mission geometry, spacecraft positions, instrument orientation, and time conversions.

Use:
Use as the root citation and kernel discovery point for mission trajectory playback.

Suggested implementation:
Pre-sample binary SPK/BSP kernels into lightweight JSON for GitHub Pages. Do not parse BSP files in the browser for the first version.

### NASA NAIF lunar mission data

URL:
https://naif.jpl.nasa.gov/naif/data_lunar.html

Reason:
NAIF lists lunar missions and their kernel types. Apollo appears here with SPK coverage.

Use:
Apollo and other lunar mission discovery.

### Apollo SPK directory

URL:
https://naif.jpl.nasa.gov/pub/naif/APOLLO/kernels/spk/

Reason:
This is the direct Apollo spacecraft trajectory kernel directory.

Use:
Apollo 8, Apollo 11, Apollo 13, Apollo 17 mission tracks.

Suggested playback:
Launch site glow at Kennedy / Cape Canaveral, countdown, liftoff, Earth parking orbit, translunar injection, coast, lunar arrival, lunar orbit, return.

Known launch anchor:
Apollo 11 launched from Kennedy LC-39A on 1969-07-16 at 13:32 UTC.

### New Horizons SPICE archive

URL:
https://naif.jpl.nasa.gov/pub/naif/pds/data/nh-j_p_ss-spice-6-v1.0/nhsp_1000/aareadme.htm

Reason:
The archive says it contains New Horizons navigation and observation geometry SPICE kernels from launch onward.

Use:
New Horizons path from Earth to Jupiter, Pluto, Arrokoth, and Kuiper Belt cruise.

Suggested events:
Launch, Jupiter flyby, Pluto flyby, Arrokoth flyby, current extended mission.

### JPL Horizons

URL:
https://ssd.jpl.nasa.gov/horizons/

Reason:
Horizons provides ephemerides for planets, satellites, select spacecraft, barycenters, and other bodies.

Use:
Fallback and verification source for spacecraft, Moon, planets, and mission event positions.

### Horizons spacecraft trajectory notes

URL:
https://ssd.jpl.nasa.gov/horizons/manual.html#spacecraft

Reason:
JPL explains that spacecraft trajectories in Horizons can come from navigation teams and flight projects, and may include full dynamics such as thruster firings, solar pressure, gravity fields, and drag.

Use:
Accuracy caveat and source explanation for mission track data.

## India / Chandrayaan

### ISRO Science Data

URL:
https://www.isro.gov.in/Sciencedata.html

Reason:
ISRO says the ISRO Science Data Archive is the repository for Indian science missions starting with Chandrayaan-1. It includes raw/reduced data, calibration, auxiliary data, higher-level products, documentation, and software, using PDS/IPDA standards.

Use:
Root source for Chandrayaan public data.

### Chandrayaan-3 ISSDC FAQ

URL:
https://pradan.issdc.gov.in/ch3/faq.xhtml

Reason:
The FAQ says the Chandrayaan-3 dataset contains SPICE kernels for ephemeris and attitude information of the propulsion and lander modules. It notes `c3p` and `c3l` prefixes.

Use:
Chandrayaan-3 trajectory and lander/probe playback.

### ESA Chandrayaan-1 SPICE page

URL:
https://www.cosmos.esa.int/web/spice/chandrayaan-1

Reason:
Search result states the Chandrayaan-1 SPICE kernel dataset contains operational observation geometry and ancillary data. The page returned a temporary 502 during checking, but the source is the ESA SPICE service.

Use:
Chandrayaan-1 trajectory source once reachable.

## China / Chang'e

### PDS Geosciences Chang'e page

URL:
https://pds-geosciences.wustl.edu/missions/chang'e/index.htm

Reason:
PDS Geosciences points to Chang'e data and says Chang'e missions are part of the Chinese Lunar Exploration Program. It links to China's Lunar and Planetary Data Release System and hosts some Chang'e-1/2 processed products.

Use:
China lunar data discovery, science/map products, landing context.

### China Lunar and Planetary Data Release System

URL:
https://moon.bao.ac.cn/

Reason:
PDS points here as the Chang'e public data release system.

Use:
Primary place to investigate whether Chang'e trajectory or attitude products are public and usable.

Status:
We verified public science data exists. We did not yet verify a clean public SPICE trajectory archive like Apollo/New Horizons/Chandrayaan.

## Russia / Soviet Luna

### LROC Soviet sample return missions

URL:
https://lroc.im-ldi.com/images/9

Reason:
LROC has public landing-site material for Luna 16, Luna 20, Luna 23, and Luna 24, including imagery and location discussion.

Use:
Landing pins, event points, visual context, and source citation for Soviet Luna sites.

### NASA NSSDC Luna 16

URL:
https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-072A

Reason:
NASA NSSDC mission page for Luna 16.

Use:
Mission metadata and event dates.

### NASA NSSDC Luna 20

URL:
https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-007A

Reason:
NASA NSSDC mission page for Luna 20.

Use:
Mission metadata and event dates.

### NASA NSSDC Luna 24

URL:
https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1976-081A

Reason:
NASA NSSDC mission page for Luna 24.

Use:
Mission metadata and event dates.

Status:
Useful public mission and site data exists. We did not find SPICE-style Soviet Luna trajectory kernels in the quick pass. Model early versions as reconstructed event paths unless a deeper archive appears.

## Moon Texture / Skinning

### NASA Images hub

URL:
https://www.nasa.gov/images/

Reason:
Entry point for NASA image resources and usage guidance.

Use:
Credits and media source discovery.

### LROC / LRO lunar data and imagery

URL:
https://www.lroc.asu.edu/

Reason:
LROC imagery is the right family for Moon surface texture and landing-site imagery.

Use:
Moon texture, landing site context, high fidelity lunar skin.

### PDS Geosciences Moon data

URL:
https://pds-geosciences.wustl.edu/missions/lunar/

Reason:
PDS Geosciences is the archive family for lunar data products, including mission instrument products.

Use:
Moon maps, topography, science products.

Implementation note:
Use an equirectangular lunar global mosaic as the `map` for the Moon sphere, and a LOLA/LRO elevation or normal/bump map as `bumpMap` or `normalMap`. Then correct the Moon rotation so the near side faces Earth while the Moon orbits.

## NASA Media Use

### NASA image resources

URL:
https://www.nasa.gov/images/

Reason:
NASA-created imagery is generally usable for educational/informational display, but the NASA insignia/logo is not a free branding mark, and individual credits can include third-party material.

Use:
Images, maps, videos, launch imagery, mission stills.

Rule for this project:
Use NASA imagery as texture/source material with citation. Do not use NASA logos or badges as branding. Check credit lines for third-party exceptions.

## Earth Rotation / Third-Person Camera / Lagrange View

### Concept

Earth should rotate from time, not from a visual-only animation speed. For mission playback, minute-by-minute launch time should slow playback enough that Earth rotation, launch site motion, Moon position, and spacecraft path are all visible in the same clock.

Implementation note:
Compute Greenwich sidereal time from JD and rotate Earth texture/group accordingly. The camera can sit in several named views:

- Earth orbit view.
- Launch-site view.
- Moon view.
- Sun-Earth L1 style view.
- Sun-Earth L2 style view.
- Earth-Moon L1 style view.

Approximate distances:

- Earth-Moon L1 is between Earth and Moon, roughly hundreds of thousands of km from Earth.
- Sun-Earth L1/L2 are around 1.5 million km from Earth.

Use:
These are camera modes, not necessarily physical spacecraft objects in the first version.

## Google Solar System / Reference Browsers

### Google Maps Space / Solar System pages

URL:
https://www.google.com/maps/space/

Reason:
Useful visual reference for planetary/moon imagery and navigation expectations.

Use:
Inspiration only. It is mostly image browsing, not Antikythera-driven time simulation or real mission path playback.

## Open Source Pieces Worth Borrowing

### CesiumJS

URL:
https://github.com/CesiumGS/cesium

Reason:
Open source 3D geospatial engine with time-dynamic positions, Earth rendering, and reference-frame concepts.

Use:
Reference architecture for time-dynamic paths and Earth camera behavior. Not necessarily a drop-in replacement for the Three.js atlas.

### satellite.js

URL:
https://github.com/shashwatak/satellite-js

Reason:
JavaScript SGP4/SDP4 satellite propagation from TLEs.

Use:
ISS and modern Earth-orbit satellites. Not the right source for Apollo/New Horizons deep-space trajectories.

### CSPICE / NAIF Toolkit

URL:
https://naif.jpl.nasa.gov/naif/toolkit.html

Reason:
Official toolkit for reading SPICE kernels.

Use:
Pre-sampling script outside the browser: kernel in, JSON track out.

## Eclipse Geometry / Shadow Cone

### NASA eclipse catalog root

URL:
https://eclipse.gsfc.nasa.gov/eclipse.html

Reason:
NASA eclipse catalogs are the source family for five-millennium eclipse data.

Use:
Eclipse presets, total-only filters, validation against known eclipse dates.

### Current project note

The orrery can show Sun-Moon-Earth geometry now. The next needed layer is a visible shadow cone:

- Moon always casts a shadow away from the Sun.
- Eclipse occurs when the Moon's shadow intersects Earth.
- Umbra: total solar eclipse.
- Penumbra: partial solar eclipse.
- Antumbra: annular eclipse.

For total eclipse focus:

- Filter UI to total solar and total lunar eclipses first.
- Draw actual Moon umbra cone in the scene.
- Later add NASA path overlays for the umbra sweep across Earth.

## Apollo Launch Playback

### NASA Apollo 11 mission page

URL:
https://www.nasa.gov/mission/apollo-11/

Reason:
Root NASA mission page for Apollo 11.

Use:
Mission event citation, public images/video/audio discovery.

### Apollo 11 launch facts

Anchor:
Apollo 11 launched from Kennedy Space Center Launch Complex 39A on 1969-07-16 at 13:32 UTC.

Use:
When Antikythera date reaches launch day/time:

- Highlight LC-39A / Cape Canaveral area.
- Show Earth rotating beneath the launch site.
- Optional countdown audio.
- Rocket marker leaves Earth and follows the pre-sampled mission path.
- Moon is rendered at its actual time-derived position.

Audio note:
Use public NASA launch audio if the credit line is clean, or record an original countdown voice locally. The feature does not require full launch audio.

## Earth Magnetic Field, Magnetosphere, Van Allen Belts

### NASA OMNIWeb / SPDF

URL:
https://omniweb.gsfc.nasa.gov/

Reason:
NASA OMNIWeb provides near-Earth solar wind, magnetic field, plasma, and energetic particle data relevant to heliospheric studies.

Use:
Historical solar wind / magnetic field data mode. Drive magnetosphere compression/expansion during selected storm/calm days.

### OMNIWeb Data Explorer

URL:
https://omniweb.gsfc.nasa.gov/form/dx1.html

Reason:
Direct data explorer for shifted-to-Earth OMNI data.

Use:
Fetch historical values for solar wind pressure, IMF, and storm day playback.

### Van Allen Probes mission / radiation belts

URL:
https://science.nasa.gov/mission/van-allen-probes/

Reason:
NASA mission source for the Van Allen Probes, which directly studied the radiation belts from 2012 to 2019.

Use:
Radiation belt layer and source citation.

Implementation:

- First version: translucent inner and outer belt torus shells around Earth.
- Better version: belt size/intensity changes from historical data where available.
- Storm playback: connect solar wind input to magnetosphere compression and belt intensity visualization.

Language preference:
Do not call the main visual layer "schematic" in the UI. The whole project is a model. Put source/provenance in a details drawer instead.

## Antikythera Reconstruction / Dial Logic

### User goal

The Antikythera layer should not be only a time scrubber. It should run in parallel with the modern ephemeris:

- Shared stem: Julian Day drives everything.
- Modern layer: planets, Moon, Sun, spacecraft from modern ephemerides / SPICE / Horizons.
- Ancient layer: Antikythera readout from gear-cycle logic.

### Initial dial targets

Add readouts first, then graphics:

- Metonic cycle.
- Saros cycle.
- Exeligmos cycle.
- Lunar phase / synodic month.
- Callippic cycle if needed.
- Eclipse prediction markers.

### Validation plan

Compare three things for selected historical dates:

1. Modern ephemeris geometry.
2. NASA eclipse catalog date/type.
3. Antikythera-cycle prediction readout.

The point is not that ancient gears equal modern ephemeris. The point is to show how close the ancient cycle logic gets, and where it diverges.

Useful general source family:

URL:
https://www.nature.com/search?q=Antikythera%20mechanism

Reason:
Nature has major Antikythera reconstruction papers. Use the published gear ratios and dial descriptions rather than random GitHub ports.

Implementation note:
The existing `antikythera.js` should be audited against this goal. If it only maps JD to UI position, add an `antikytheraCycles.js` module that computes ancient readout positions from the same JD.

## Suggested File Layout

```text
atlas-cosmogram/proposals/scale-orrery/
  missions.js
  earth-fields.js
  antikytheraCycles.js
  eclipse-cones.js
  missions/
    apollo-11.json
    apollo-13.json
    new-horizons.json
    chandrayaan-3.json
  sources/
    mission-source-index.json
```

## Mission JSON Shape

```json
{
  "id": "apollo-11",
  "name": "Apollo 11",
  "frame": "earth-moon-inertial",
  "source": {
    "name": "NASA/JPL NAIF SPICE",
    "url": "https://naif.jpl.nasa.gov/pub/naif/APOLLO/kernels/spk/"
  },
  "launch": {
    "site": "LC-39A",
    "lat": 28.6084,
    "lon": -80.6043,
    "jd": 2440423.064
  },
  "events": [
    { "label": "Launch", "jd": 2440423.064 },
    { "label": "Translunar injection", "jd": 2440423.18 },
    { "label": "Lunar orbit insertion", "jd": 2440426.25 },
    { "label": "Landing", "jd": 2440427.22 }
  ],
  "samples": [
    { "jd": 2440423.064, "xKm": 0, "yKm": 0, "zKm": 0 }
  ]
}
```

## Immediate Build Order

1. Add a mission layer that can load one JSON path and draw it as a line + moving craft marker.
2. Add Apollo 11 as the first hand-authored/sampled fixture.
3. Add launch site glow at LC-39A when the dial is within the launch window.
4. Add Moon texture from LROC/LRO source family.
5. Add eclipse shadow cone rendering.
6. Add total-eclipse filtering on the existing eclipse preset list.
7. Add Earth fields layer with magnetosphere and Van Allen belt toggles.
8. Add Antikythera cycle readouts against modern ephemeris.

## Credit Pattern

Use a compact source drawer. Example:

```text
Trajectory: NASA/JPL NAIF SPICE
Planet/Moon positions: JPL Horizons / Meeus where noted
Eclipses: NASA GSFC Five Millennium Canon
Moon imagery: NASA/GSFC/Arizona State University LROC
Solar wind: NASA GSFC SPDF OMNIWeb
Radiation belts: NASA Van Allen Probes
```

Keep raw URLs in the source drawer or linked credits so future copy/paste keeps the references intact.
