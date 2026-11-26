# Sources and reuse

- **FeistTech / qv4rk**: [existing Scale Orrery](https://github.com/qv4rk/GrokBotPlayground/tree/main/atlas-cosmogram/proposals/scale-orrery),
  its orbit paths, true/visible size conventions, Galilean moon model, map-loader
  and controls. Local adaptations are in `orrery/`.
- **FeistTech Globe & Sky**: [V/space/cosmos.js](https://github.com/qv4rk/V/blob/main/space/cosmos.js).
  This is the existing renderer for Western and Chinese constellation figures,
  not a newly invented star map. Changes: local asset paths, visible load errors,
  brighter figures, and exposing catalog records for tap identification.
- **Astronomy Engine, Don Cross, MIT**:
  https://github.com/cosinekitty/astronomy . Browser distribution blob
  `fc5ab5c406c6fd64bdd537772e4cc7c8d438275b`; license included in `vendor/`.
  Shared geocentric/heliocentric vectors, frame transformations, sidereal time,
  rotation axes and eclipse searches. Ephemeris target accuracy is about one arcminute.
- **Three.js r160, MIT**: https://github.com/mrdoob/three.js/tree/r160 .
  Local module build and OrbitControls, with license included.
- **d3-celestial, Olaf Frohn, BSD-3-Clause**: https://github.com/ofrohn/d3-celestial .
  5,044 catalog stars, 89 Western figure records (Serpens is split), and 312
  Chinese figure records. Western centers/names and Chinese figures are retained
  from the existing source catalogs. License included.
- **Earth map**: NASA Blue Marble, via
  https://github.com/vasturiano/three-globe/blob/master/example/img/earth-blue-marble.jpg .
  Bundled at 2048 × 1024 for mobile use.
- **Moon map**: NASA/LROC lunar surface map, via
  https://github.com/vasturiano/globe.gl/blob/master/example/moon-landing-sites/lunar_surface.jpg .
  Bundled at 2048 × 1024 for mobile use.
- **Planet maps**: Solar System Scope, CC BY 4.0,
  https://www.solarsystemscope.com/textures/ . Files obtained from the public
  mirrors https://github.com/rajpatel5/Solar-System and
  https://github.com/elymas/solar-simulator/tree/main/public/textures .
  JPEGs resized to 1024 × 512. Venus uses the supplied radar surface map; the
  Galilean moon surfaces retain the existing generated textures.
- **NASA independent reference, Fred Espenak**:
  https://eclipse.gsfc.nasa.gov/SEmono/TSE1999/T99Tab3.html .
  Published ground-track coordinates check the result of the geometric
  Sun–Moon axis / WGS84 intersection; they do not place the shadow.
  Credit: Eclipse Predictions by Fred Espenak, NASA's GSFC.

The Earth shader calculates finite angular disk overlap at each fragment, using
`atan(length(cross), dot)` to preserve small angular separations on the GPU.
It explicitly handles contained disks for annular as well as total eclipses.
Scene mapping is `(equatorial x, equatorial z, −equatorial y)`; it is a rotation,
not a reflection. Earth longitude zero and the observer share apparent Greenwich
sidereal time and the true equator of date. Shader logarithmic depth matches the
standard materials so the sky cannot draw through Earth.

No images or conversation material from the supplied Gemini export are published.
Only this factual export audit and the implementation/provenance files are included.
