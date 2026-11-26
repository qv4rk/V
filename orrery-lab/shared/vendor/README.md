# Vendored third-party sources

Each subdirectory named for an upstream **GitHub repository** holds a shallow copy of the needed files (or the full tree when it is a reasonable size). There are **no git submodules**. Each folder keeps the upstream `LICENSE` (or `LICENSE.txt` / `LICENSE.md` / `LICENSE-AGPL-3.0.txt`) and a `README.md` with the original author, repository URL, and the commit SHA that was copied.

Compatibility symlinks at the old flattened paths (`three.module.js`, `maplibre/`, `d3/d3.v7.min.js`, and so on) keep existing app URLs working.

| Folder | Upstream | License | SHA |
|---|---|---|---|
| `three.js/` | [mrdoob/three.js](https://github.com/mrdoob/three.js) ([Ricardo Cabello](https://github.com/mrdoob)) | MIT | `d04539a76736ff500cae883d6a38b3dd8643c548` (r160) |
| `astronomy/` | [cosinekitty/astronomy](https://github.com/cosinekitty/astronomy) ([Don Cross](https://github.com/cosinekitty)) | MIT | `61dc07020aaa6885d2c7f688a4d82beaf6edb9ef` (v2.1.19) |
| `d3/` | [d3/d3](https://github.com/d3/d3) ([Mike Bostock](https://github.com/mbostock)) | ISC | `1f8dd3b92960f58726006532c11e9457864513ec` (v7.9.0) |
| `maplibre-gl-js/` | [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | BSD-style | `14f56b00e0f08784681ef98f0731c60f3923a4a9` (v5.9.0) |
| `satellite-js/` | [shashwatak/satellite-js](https://github.com/shashwatak/satellite-js) ([Shashwat Kandadai](https://github.com/shashwatak)) | MIT | `8a6aada761d41b2dafd3c627fbe265a031d45579` (5.0.0) |
| `topojson-client/` | [topojson/topojson-client](https://github.com/topojson/topojson-client) ([Mike Bostock](https://github.com/mbostock)) | ISC | `71e5bd6428fd8b7a40fa980d2ef7862140851f03` |
| `world-atlas/` | [topojson/world-atlas](https://github.com/topojson/world-atlas) ([Mike Bostock](https://github.com/mbostock)) | ISC | `a912c0a22c3fbd1979cb6defdd6389d8c35e7c2a` |
| `d3-celestial/` | [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial) ([Olaf Frohn](https://github.com/ofrohn)) | BSD-3-Clause | `7e720a3de062059d4c5400a379146a601d9010e0` |
| `stellarium-skycultures/` | [Stellarium/stellarium-skycultures](https://github.com/Stellarium/stellarium-skycultures) | **AGPL-3.0** | `2d80ce70984c14bba7da2d31a0f9b27e292861c9` |

`stellarium-skycultures` is share-alike AGPL-3.0. Read that folder’s README before distributing a modified network service that includes those files.

Textures and the generated eclipse catalog are **not** GitHub-first data sources; see `shared/textures/README.md` and `shared/eclipses/` notes in `shared/README.md`.
