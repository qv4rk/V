# world-atlas (vendored)

The world-atlas **git** repository at the commit below does not ship the generated TopoJSON; those files are produced by its `prepublish` script / npm package. This folder keeps the upstream license and package metadata from that commit, plus the `land-110m.json` file already used by the apps (Natural Earth 110m land).

- Author: [Mike Bostock (mbostock)](https://github.com/mbostock) / [TopoJSON](https://github.com/topojson); land geometry from [Natural Earth](https://www.naturalearthdata.com/)
- Repository: https://github.com/topojson/world-atlas
- Commit SHA: `a912c0a22c3fbd1979cb6defdd6389d8c35e7c2a`
- Commit date: 5 September 2019, 1:16 PM America/New_York (2019-09-05T17:16:12Z)
- License: ISC (`LICENSE` in this folder, taken from that commit). Natural Earth’s terms also apply to the land geometry.

Files here:

- `LICENSE`, `package.json`
- `UPSTREAM-README.md` — the upstream README from that commit
- `land-110m.json` — the file served to apps (also kept at `shared/geo/land-110m.json` so existing paths still work)

No `.git` and no submodule.
