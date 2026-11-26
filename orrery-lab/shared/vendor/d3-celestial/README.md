# d3-celestial (vendored)

Shallow copy of **LICENSE, readme, and `data/`** from the commit below (the star and constellation catalogs). Demo, dist, and `.git` are not included. No submodule.

- Author: [Olaf Frohn (ofrohn)](https://github.com/ofrohn)
- Repository: https://github.com/ofrohn/d3-celestial
- Commit SHA: `7e720a3de062059d4c5400a379146a601d9010e0` (master at the time of copy)
- Commit date: 5 July 2022, 2:03 PM America/New_York (2022-07-05T18:03:41Z)
- License: BSD-3-Clause (`LICENSE` in this folder, taken from that commit)

Star positions in this catalog are derived from Hipparcos / XHIP as credited upstream.

Files here:

- `LICENSE`, `readme.md` (upstream)
- `data/` — including `stars.6.json`, `constellations.lines.json`, `constellations.lines.cn.json`, `constellations.json`, and the rest of the data set at that commit

The copies already used by the apps live at `shared/stars/` and `shared/constellations/` (verbatim from V / the Atlas preview). Record hashes differ from this tree (whitespace / packing); do not treat them as a different catalog without a record-level check. Serve aliases keep pointing at the existing shared copies so app behavior does not change in this pass.
