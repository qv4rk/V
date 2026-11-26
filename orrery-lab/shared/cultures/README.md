# Stellarium-derived culture figures

`stellarium-figures.json` is a compact RA/Dec line catalog built from the vendored Stellarium skycultures (Hipparcos IDs resolved through d3-celestial star positions).

- Source: [Stellarium/stellarium-skycultures](https://github.com/Stellarium/stellarium-skycultures)
- Commit: `2d80ce70984c14bba7da2d31a0f9b27e292861c9`
- License: **AGPL-3.0** (see `../vendor/stellarium-skycultures/LICENSE-AGPL-3.0.txt`). This derived file is also under AGPL-3.0 and is not relicensed.
- Star positions: [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3-Clause, [Olaf Frohn](https://github.com/ofrohn))

Cultures included: `arabic` (`arabic_lunar_stations`), `indian`, `maori`, and `stellarium-chinese` (data present; the harness menu draws Chinese figures from the existing d3-celestial in-app catalogs, and Arabic / Indian / Māori on the host overlay).
