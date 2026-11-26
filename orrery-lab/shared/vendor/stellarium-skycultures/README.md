# stellarium-skycultures (vendored)

Shallow, sparse copy of **only the cultures listed below**, plus the repository license and upstream README. The full Stellarium application is a different, much larger repo (GPL-2.0) and is **not** vendored. History / `.git` is not included. No submodule.

- Authors and maintainers: [Stellarium](https://github.com/Stellarium) and the culture contributors named in each folder’s `index.json` (traditional knowledge holders and researchers — keep those files intact)
- Repository: https://github.com/Stellarium/stellarium-skycultures
- Commit SHA: `2d80ce70984c14bba7da2d31a0f9b27e292861c9` (master at the time of copy)
- Commit date: 2 November 2026, 3:19 PM America/New_York (2026-11-02T20:19:24Z)
- License: **AGPL-3.0** (`LICENSE-AGPL-3.0.txt` in this folder, taken from that commit). Individual culture folders may also name additional credit or terms in `index.json`.

## Share-alike / AGPL

These skyculture files are licensed under the GNU Affero General Public License v3. They are **not** relicensed by being placed in this tree. If you convey a modified version, or run a modified version as a network service that includes these files, AGPL-3.0 may require you to offer the corresponding source to users. The rest of the harness keeps each other vendor’s own license (MIT, BSD, ISC, and so on). Do not treat a combined distribution as MIT-only.

## Cultures copied

Chosen to cover the cultural skies already drawn (Western, Chinese) and those listed as the next step from the 25 Nov 2026 research notes:

| Folder | Why it is here |
|---|---|
| `western` | European / IAU figures (CUL-01, already drawn from d3-celestial in this pass) |
| `chinese` | Chinese 三垣二十八宿 |
| `arabic_al-sufi` | Arabic / al-Ṣūfī |
| `arabic_ancient` | Pre-Islamic / ancient Arabic |
| `arabic_lunar_stations` | Arabic lunar mansions (anwāʾ) |
| `indian` | Indian nakshatras |
| `maori` | Māori (Matariki / Tātai Arorangi) |
| `hawaiian_starlines` | Hawaiian Polynesian star lines |
| `navajo` | Navajo / Diné |
| `boorong` | Boorong (Aboriginal Australian tradition; not a stand-in for all Aboriginal skies) |
| `kamilaroi` | Kamilaroi (Aboriginal Australian tradition) |
| `northern_andes` | Andean figures (closest sourced set here). Inca / Quechua dark constellations (Mayu, yana phuyu, Qullqa as dust-lane outlines) may still be incomplete in this pack and must not be invented |

**Not drawn in the harness yet.** These files are vendored so the next pass can import sourced figures. Evidence: **source present** in this folder; runtime drawing is **unresolved**.
