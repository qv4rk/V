# articles_consolidated: INDEX

A byte-for-byte copy of every article that existed in `qv4rk/V` on 2026-11-24, made so the old articles can be reviewed and reordered before they are retired. **The originals were not moved or deleted.** Each copy keeps its original path as a subfolder, so nothing collides. One change of folder name: the hidden folder `.drafts-2026-11-05/` is copied as `drafts-2026-11-05/` (no leading dot) so it shows up on your phone and in file browsers.

Images: the HTML pages in `articles/` load pictures from `articles/images/`, which is copied alongside them, so they still open with pictures. The Markdown nodes refer to `images/...` relative to the `articles/` folder, so when you view a node on its own, look in `articles/images/`.

## Counts

| What | Format | Files |
|---|---|---|
| article | html | 54 |
| article | json | 38 |
| article | md | 37 |
| image | jpg | 14 |
| index-page | html | 2 |
| manifest | json | 1 |
| placeholder | (none) | 1 |
| **total** | | **147** |

## Where they came from

- `nodes/` → `articles_consolidated/nodes/` (28 files): Live article source (Markdown nodes the build turns into pages)
- `articles/` → `articles_consolidated/articles/` (43 files): Live generated article pages + their images
- `data/reading-room/` → `articles_consolidated/data/reading-room/` (39 files): Live Reading Room library (JSON per article + manifest)
- `.drafts-2026-11-05/` → `articles_consolidated/drafts-2026-11-05/` (37 files): Older drafts parked on 2026-11-05 (hidden dot-folder, still publicly served)

## Likely duplicates, in short

Most articles exist in three forms that are the *same article*, not separate ones: the Markdown source in `nodes/`, the generated page in `articles/`, and the Reading Room JSON in `data/reading-room/articles/`. Keep the `nodes/*.md` one: it is the source the other two are built from.

**Why the Reading Room looks duplicated today:** its library list (`data/reading-room/manifest.json`) still includes 10 older versions that were parked in drafts on 2026-11-05 (`bt01`–`bt07`, `n02`–`n04`). Each one has the same title as a current chapter (`sotm00NN-…`), so readers see two copies. `sotm0022-ps-ar.html` is only a redirect to `sotm0006-ps-ar.html` (the current chapter 22 text). `route-60-to-the-master-fund` exists only as Reading Room JSON, with no Markdown source. Nothing was removed yet; retiring these is the next step, after you review.

| Article id | Title | nodes .md | articles .html | reading-room .json | drafts .md | drafts .html |
|---|---|---|---|---|---|---|
| `bt01` | Equalization, 1801-1824 |  |  | ✓ | ✓ | ✓ |
| `bt02` | Crotty's House, 1832 |  |  | ✓ | ✓ | ✓ |
| `bt03` | Moore's Forecast and Peel's Corn, 1845-1846 |  |  | ✓ | ✓ | ✓ |
| `bt04` | Trevelyan to Monteagle, 9 October 1846 |  |  | ✓ | ✓ | ✓ |
| `bt05` | de Vere's Letter, 1847 |  |  | ✓ | ✓ | ✓ |
| `bt06` | 14 Henrietta Street, 1849-1858 |  |  | ✓ | ✓ | ✓ |
| `bt07` | From the Well to the Church, 1850-1878 |  |  | ✓ | ✓ | ✓ |
| `bt08` | £10,000 of Turnips, 1880 | ✓ | ✓ | ✓ |  | ✓ |
| `bt09` | Hyde Resigns, Dundalk, 1915 | ✓ | ✓ | ✓ |  | ✓ |
| `bt10` | Eighteen Men in Under an Hour, 1903 | ✓ | ✓ | ✓ |  | ✓ |
| `bt11` | Howth and Bachelors Walk, 26 July 1914 | ✓ | ✓ | ✓ |  | ✓ |
| `bt12` | The Letter Hussein Kept, 1915-1917 | ✓ | ✓ | ✓ |  | ✓ |
| `bt13` | Portobello Barracks, 26 April 1916 | ✓ | ✓ | ✓ |  | ✓ |
| `bt14` | Great Brunswick Street, 1919-1920 | ✓ | ✓ | ✓ |  | ✓ |
| `bt15` | Croke Park, 21 November 1920 | ✓ | ✓ | ✓ |  | ✓ |
| `bt16` | Two Letters, Downing Street, 1921 | ✓ | ✓ | ✓ |  | ✓ |
| `bt17` | Churchill's Instruction, Spring 1922 | ✓ | ✓ | ✓ |  | ✓ |
| `bt18` | Duff, Jerusalem, 1922-1938 | ✓ | ✓ | ✓ |  | ✓ |
| `bt19` | Ya'bad to the UN, 1935-1947 | ✓ | ✓ | ✓ |  | ✓ |
| `n02` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire |  |  | ✓ | ✓ | ✓ |
| `n03` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 |  |  | ✓ | ✓ | ✓ |
| `n04` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 |  |  | ✓ | ✓ | ✓ |
| `n05` | After the Pashas: Tanzimat, the Land Code, and the New Lords of Palestine | ✓ | ✓ | ✓ |  | ✓ |
| `n06` | The Standard Nobody Else Meets | ✓ | ✓ | ✓ |  | ✓ |
| `n07` | The Multazim's Register: Tulkarm's Rural Notables and the Land Code, 1858-1938 | ✓ | ✓ | ✓ |  | ✓ |
| `n08` | Warnier's Sentence, 1873 | ✓ | ✓ | ✓ |  | ✓ |
| `route-60-to-the-master-fund` | Route 60 to the Master Fund: 7 October and the Plans That Predated It |  |  | ✓ |  |  |
| `sotm0001-ie-en` | Equalization, 1801-1824 | ✓ | ✓ | ✓ |  |  |
| `sotm0002-cn-zh` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 | ✓ | ✓ | ✓ |  |  |
| `sotm0003-ie-ga` | From the Well to the Church, 1850-1878 | ✓ | ✓ | ✓ |  |  |
| `sotm0004-ie-ga` | Crotty's House, 1832 | ✓ | ✓ | ✓ |  |  |
| `sotm0005-cn-zh` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire | ✓ | ✓ | ✓ |  |  |
| `sotm0006-ps-ar` | Ledger and Mob, Galilee, 1831–1840 | ✓ | ✓ | ✓ |  |  |
| `sotm0009-ie-ga` | Moore's Forecast and Peel's Corn, 1845-1846 | ✓ | ✓ | ✓ |  |  |
| `sotm0010-cn-zh` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 | ✓ | ✓ | ✓ |  |  |
| `sotm0011-ie-ga` | Trevelyan to Monteagle, 9 October 1846 | ✓ | ✓ | ✓ |  |  |
| `sotm0014-ie-ga` | de Vere's Letter, 1847 | ✓ | ✓ | ✓ |  |  |
| `sotm0016-ie-ga` | 14 Henrietta Street, 1849-1858 | ✓ | ✓ | ✓ |  |  |
| `sotm0022-ps-ar` | Ledger and Mob, Galilee, 1831–1840 |  | ✓ |  |  |  |

Exact byte-identical copies (same content in two places):

- `articles/bt08.html` = `.drafts-2026-11-05/articles/bt08.html`
- `articles/bt09.html` = `.drafts-2026-11-05/articles/bt09.html`
- `articles/bt10.html` = `.drafts-2026-11-05/articles/bt10.html`
- `articles/bt11.html` = `.drafts-2026-11-05/articles/bt11.html`
- `articles/bt12.html` = `.drafts-2026-11-05/articles/bt12.html`
- `articles/bt13.html` = `.drafts-2026-11-05/articles/bt13.html`
- `articles/bt14.html` = `.drafts-2026-11-05/articles/bt14.html`
- `articles/bt15.html` = `.drafts-2026-11-05/articles/bt15.html`
- `articles/bt16.html` = `.drafts-2026-11-05/articles/bt16.html`
- `articles/bt17.html` = `.drafts-2026-11-05/articles/bt17.html`
- `articles/bt18.html` = `.drafts-2026-11-05/articles/bt18.html`
- `articles/bt19.html` = `.drafts-2026-11-05/articles/bt19.html`
- `articles/n05.html` = `.drafts-2026-11-05/articles/n05.html`
- `articles/n06.html` = `.drafts-2026-11-05/articles/n06.html`
- `articles/n07.html` = `.drafts-2026-11-05/articles/n07.html`

Same title under two different ids:

- `bt01`, `sotm0001-ie-en`: “Equalization, 1801-1824”
- `n03`, `sotm0002-cn-zh`: “The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839”
- `bt07`, `sotm0003-ie-ga`: “From the Well to the Church, 1850-1878”
- `bt02`, `sotm0004-ie-ga`: “Crotty's House, 1832”
- `n02`, `sotm0005-cn-zh`: “The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire”
- `sotm0006-ps-ar`, `sotm0022-ps-ar`: “Ledger and Mob, Galilee, 1831–1840”
- `bt03`, `sotm0009-ie-ga`: “Moore's Forecast and Peel's Corn, 1845-1846”
- `n04`, `sotm0010-cn-zh`: “Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839”
- `bt04`, `sotm0011-ie-ga`: “Trevelyan to Monteagle, 9 October 1846”
- `bt05`, `sotm0014-ie-ga`: “de Vere's Letter, 1847”
- `bt06`, `sotm0016-ie-ga`: “14 Henrietta Street, 1849-1858”

## Every file

| Original path | Copy in this folder | Title | Format | Size | Duplicate note |
|---|---|---|---|---|---|
| `nodes/bt08.md` | `nodes/bt08.md` | £10,000 of Turnips, 1880 | md (article) | 7,801 B | same article id `bt08` also at articles/bt08.html, data/reading-room/articles/bt08.json, .drafts-2026-11-05/articles/bt08.html |
| `nodes/bt09.md` | `nodes/bt09.md` | Hyde Resigns, Dundalk, 1915 | md (article) | 7,976 B | same article id `bt09` also at articles/bt09.html, data/reading-room/articles/bt09.json, .drafts-2026-11-05/articles/bt09.html |
| `nodes/bt10.md` | `nodes/bt10.md` | Eighteen Men in Under an Hour, 1903 | md (article) | 8,095 B | same article id `bt10` also at articles/bt10.html, data/reading-room/articles/bt10.json, .drafts-2026-11-05/articles/bt10.html |
| `nodes/bt11.md` | `nodes/bt11.md` | Howth and Bachelors Walk, 26 July 1914 | md (article) | 7,456 B | same article id `bt11` also at articles/bt11.html, data/reading-room/articles/bt11.json, .drafts-2026-11-05/articles/bt11.html |
| `nodes/bt12.md` | `nodes/bt12.md` | The Letter Hussein Kept, 1915-1917 | md (article) | 7,825 B | same article id `bt12` also at articles/bt12.html, data/reading-room/articles/bt12.json, .drafts-2026-11-05/articles/bt12.html |
| `nodes/bt13.md` | `nodes/bt13.md` | Portobello Barracks, 26 April 1916 | md (article) | 6,763 B | same article id `bt13` also at articles/bt13.html, data/reading-room/articles/bt13.json, .drafts-2026-11-05/articles/bt13.html |
| `nodes/bt14.md` | `nodes/bt14.md` | Great Brunswick Street, 1919-1920 | md (article) | 6,863 B | same article id `bt14` also at articles/bt14.html, data/reading-room/articles/bt14.json, .drafts-2026-11-05/articles/bt14.html |
| `nodes/bt15.md` | `nodes/bt15.md` | Croke Park, 21 November 1920 | md (article) | 6,501 B | same article id `bt15` also at articles/bt15.html, data/reading-room/articles/bt15.json, .drafts-2026-11-05/articles/bt15.html |
| `nodes/bt16.md` | `nodes/bt16.md` | Two Letters, Downing Street, 1921 | md (article) | 6,457 B | same article id `bt16` also at articles/bt16.html, data/reading-room/articles/bt16.json, .drafts-2026-11-05/articles/bt16.html |
| `nodes/bt17.md` | `nodes/bt17.md` | Churchill's Instruction, Spring 1922 | md (article) | 6,395 B | same article id `bt17` also at articles/bt17.html, data/reading-room/articles/bt17.json, .drafts-2026-11-05/articles/bt17.html |
| `nodes/bt18.md` | `nodes/bt18.md` | Duff, Jerusalem, 1922-1938 | md (article) | 5,916 B | same article id `bt18` also at articles/bt18.html, data/reading-room/articles/bt18.json, .drafts-2026-11-05/articles/bt18.html |
| `nodes/bt19.md` | `nodes/bt19.md` | Ya'bad to the UN, 1935-1947 | md (article) | 6,023 B | same article id `bt19` also at articles/bt19.html, data/reading-room/articles/bt19.json, .drafts-2026-11-05/articles/bt19.html |
| `nodes/n05.md` | `nodes/n05.md` | After the Pashas: Tanzimat, the Land Code, and the New Lords of Palestine | md (article) | 5,580 B | same article id `n05` also at articles/n05.html, data/reading-room/articles/n05.json, .drafts-2026-11-05/articles/n05.html |
| `nodes/n06.md` | `nodes/n06.md` | The Standard Nobody Else Meets | md (article) | 15,324 B | same article id `n06` also at articles/n06.html, data/reading-room/articles/n06.json, .drafts-2026-11-05/articles/n06.html |
| `nodes/n07.md` | `nodes/n07.md` | The Multazim's Register: Tulkarm's Rural Notables and the Land Code, 1858-1938 | md (article) | 8,236 B | same article id `n07` also at articles/n07.html, data/reading-room/articles/n07.json, .drafts-2026-11-05/articles/n07.html |
| `nodes/n08.md` | `nodes/n08.md` | Warnier's Sentence, 1873 | md (article) | 9,445 B | same article id `n08` also at articles/n08.html, data/reading-room/articles/n08.json, .drafts-2026-11-05/articles/n08.html |
| `nodes/sotm0001-ie-en.md` | `nodes/sotm0001-ie-en.md` | Equalization, 1801-1824 | md (article) | 15,789 B | same article id `sotm0001-ie-en` also at articles/sotm0001-ie-en.html, data/reading-room/articles/sotm0001-ie-en.json; same title as id bt01 |
| `nodes/sotm0002-cn-zh.md` | `nodes/sotm0002-cn-zh.md` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 | md (article) | 24,948 B | same article id `sotm0002-cn-zh` also at articles/sotm0002-cn-zh.html, data/reading-room/articles/sotm0002-cn-zh.json; same title as id n03 |
| `nodes/sotm0003-ie-ga.md` | `nodes/sotm0003-ie-ga.md` | From the Well to the Church, 1850-1878 | md (article) | 12,034 B | same article id `sotm0003-ie-ga` also at articles/sotm0003-ie-ga.html, data/reading-room/articles/sotm0003-ie-ga.json; same title as id bt07 |
| `nodes/sotm0004-ie-ga.md` | `nodes/sotm0004-ie-ga.md` | Crotty's House, 1832 | md (article) | 18,257 B | same article id `sotm0004-ie-ga` also at articles/sotm0004-ie-ga.html, data/reading-room/articles/sotm0004-ie-ga.json; same title as id bt02 |
| `nodes/sotm0005-cn-zh.md` | `nodes/sotm0005-cn-zh.md` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire | md (article) | 17,259 B | same article id `sotm0005-cn-zh` also at articles/sotm0005-cn-zh.html, data/reading-room/articles/sotm0005-cn-zh.json; same title as id n02 |
| `nodes/sotm0006-ps-ar.md` | `nodes/sotm0006-ps-ar.md` | Ledger and Mob, Galilee, 1831–1840 | md (article) | 63,103 B | same article id `sotm0006-ps-ar` also at articles/sotm0006-ps-ar.html, data/reading-room/articles/sotm0006-ps-ar.json; same title as id sotm0022-ps-ar |
| `nodes/sotm0009-ie-ga.md` | `nodes/sotm0009-ie-ga.md` | Moore's Forecast and Peel's Corn, 1845-1846 | md (article) | 20,838 B | same article id `sotm0009-ie-ga` also at articles/sotm0009-ie-ga.html, data/reading-room/articles/sotm0009-ie-ga.json; same title as id bt03 |
| `nodes/sotm0010-cn-zh.md` | `nodes/sotm0010-cn-zh.md` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 | md (article) | 11,547 B | same article id `sotm0010-cn-zh` also at articles/sotm0010-cn-zh.html, data/reading-room/articles/sotm0010-cn-zh.json; same title as id n04 |
| `nodes/sotm0011-ie-ga.md` | `nodes/sotm0011-ie-ga.md` | Trevelyan to Monteagle, 9 October 1846 | md (article) | 14,247 B | same article id `sotm0011-ie-ga` also at articles/sotm0011-ie-ga.html, data/reading-room/articles/sotm0011-ie-ga.json; same title as id bt04 |
| `nodes/sotm0014-ie-ga.md` | `nodes/sotm0014-ie-ga.md` | de Vere's Letter, 1847 | md (article) | 12,503 B | same article id `sotm0014-ie-ga` also at articles/sotm0014-ie-ga.html, data/reading-room/articles/sotm0014-ie-ga.json; same title as id bt05 |
| `nodes/sotm0016-ie-ga.md` | `nodes/sotm0016-ie-ga.md` | 14 Henrietta Street, 1849-1858 | md (article) | 10,025 B | same article id `sotm0016-ie-ga` also at articles/sotm0016-ie-ga.html, data/reading-room/articles/sotm0016-ie-ga.json; same title as id bt06 |
| `nodes/tags/.gitkeep` | `nodes/tags/.gitkeep` |  | (none) (placeholder) | 279 B |  |
| `articles/bt08.html` | `articles/bt08.html` | £10,000 of Turnips, 1880 · The Atlas | html (article) | 23,141 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt08.html; same article id `bt08` also at nodes/bt08.md, data/reading-room/articles/bt08.json |
| `articles/bt09.html` | `articles/bt09.html` | Hyde Resigns, Dundalk, 1915 · The Atlas | html (article) | 23,432 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt09.html; same article id `bt09` also at nodes/bt09.md, data/reading-room/articles/bt09.json |
| `articles/bt10.html` | `articles/bt10.html` | Eighteen Men in Under an Hour, 1903 · The Atlas | html (article) | 23,181 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt10.html; same article id `bt10` also at nodes/bt10.md, data/reading-room/articles/bt10.json |
| `articles/bt11.html` | `articles/bt11.html` | Howth and Bachelors Walk, 26 July 1914 · The Atlas | html (article) | 22,921 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt11.html; same article id `bt11` also at nodes/bt11.md, data/reading-room/articles/bt11.json |
| `articles/bt12.html` | `articles/bt12.html` | The Letter Hussein Kept, 1915-1917 · The Atlas | html (article) | 23,445 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt12.html; same article id `bt12` also at nodes/bt12.md, data/reading-room/articles/bt12.json |
| `articles/bt13.html` | `articles/bt13.html` | Portobello Barracks, 26 April 1916 · The Atlas | html (article) | 22,019 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt13.html; same article id `bt13` also at nodes/bt13.md, data/reading-room/articles/bt13.json |
| `articles/bt14.html` | `articles/bt14.html` | Great Brunswick Street, 1919-1920 · The Atlas | html (article) | 21,917 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt14.html; same article id `bt14` also at nodes/bt14.md, data/reading-room/articles/bt14.json |
| `articles/bt15.html` | `articles/bt15.html` | Croke Park, 21 November 1920 · The Atlas | html (article) | 21,681 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt15.html; same article id `bt15` also at nodes/bt15.md, data/reading-room/articles/bt15.json |
| `articles/bt16.html` | `articles/bt16.html` | Two Letters, Downing Street, 1921 · The Atlas | html (article) | 21,741 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt16.html; same article id `bt16` also at nodes/bt16.md, data/reading-room/articles/bt16.json |
| `articles/bt17.html` | `articles/bt17.html` | Churchill's Instruction, Spring 1922 · The Atlas | html (article) | 21,627 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt17.html; same article id `bt17` also at nodes/bt17.md, data/reading-room/articles/bt17.json |
| `articles/bt18.html` | `articles/bt18.html` | Duff, Jerusalem, 1922-1938 · The Atlas | html (article) | 20,843 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt18.html; same article id `bt18` also at nodes/bt18.md, data/reading-room/articles/bt18.json |
| `articles/bt19.html` | `articles/bt19.html` | Ya'bad to the UN, 1935-1947 · The Atlas | html (article) | 21,127 B | IDENTICAL bytes to .drafts-2026-11-05/articles/bt19.html; same article id `bt19` also at nodes/bt19.md, data/reading-room/articles/bt19.json |
| `articles/index.html` | `articles/index.html` |  | html (index-page) | 12,925 B |  |
| `articles/n05.html` | `articles/n05.html` | After the Pashas: Tanzimat, the Land Code, and the New Lords of Palestine · The Atlas | html (article) | 19,936 B | IDENTICAL bytes to .drafts-2026-11-05/articles/n05.html; same article id `n05` also at nodes/n05.md, data/reading-room/articles/n05.json |
| `articles/n06.html` | `articles/n06.html` | The Standard Nobody Else Meets · The Atlas | html (article) | 30,178 B | IDENTICAL bytes to .drafts-2026-11-05/articles/n06.html; same article id `n06` also at nodes/n06.md, data/reading-room/articles/n06.json |
| `articles/n07.html` | `articles/n07.html` | The Multazim's Register: Tulkarm's Rural Notables and the Land Code, 1858-1938 · The Atlas | html (article) | 22,693 B | IDENTICAL bytes to .drafts-2026-11-05/articles/n07.html; same article id `n07` also at nodes/n07.md, data/reading-room/articles/n07.json |
| `articles/n08.html` | `articles/n08.html` | Warnier's Sentence, 1873 · The Atlas | html (article) | 24,811 B | same article id `n08` also at nodes/n08.md, data/reading-room/articles/n08.json, .drafts-2026-11-05/articles/n08.html |
| `articles/sotm0001-ie-en.html` | `articles/sotm0001-ie-en.html` | Equalization, 1801-1824 · The Atlas | html (article) | 31,100 B | same article id `sotm0001-ie-en` also at nodes/sotm0001-ie-en.md, data/reading-room/articles/sotm0001-ie-en.json; same title as id bt01 |
| `articles/sotm0002-cn-zh.html` | `articles/sotm0002-cn-zh.html` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 · The Atlas | html (article) | 39,794 B | same article id `sotm0002-cn-zh` also at nodes/sotm0002-cn-zh.md, data/reading-room/articles/sotm0002-cn-zh.json; same title as id n03 |
| `articles/sotm0003-ie-ga.html` | `articles/sotm0003-ie-ga.html` | From the Well to the Church, 1850-1878 · The Atlas | html (article) | 27,289 B | same article id `sotm0003-ie-ga` also at nodes/sotm0003-ie-ga.md, data/reading-room/articles/sotm0003-ie-ga.json; same title as id bt07 |
| `articles/sotm0004-ie-ga.html` | `articles/sotm0004-ie-ga.html` | Crotty's House, 1832 · The Atlas | html (article) | 33,182 B | same article id `sotm0004-ie-ga` also at nodes/sotm0004-ie-ga.md, data/reading-room/articles/sotm0004-ie-ga.json; same title as id bt02 |
| `articles/sotm0005-cn-zh.html` | `articles/sotm0005-cn-zh.html` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire · The Atlas | html (article) | 32,025 B | same article id `sotm0005-cn-zh` also at nodes/sotm0005-cn-zh.md, data/reading-room/articles/sotm0005-cn-zh.json; same title as id n02 |
| `articles/sotm0006-ps-ar.html` | `articles/sotm0006-ps-ar.html` | Ledger and Mob, Galilee, 1831–1840 · The Atlas | html (article) | 77,032 B | same article id `sotm0006-ps-ar` also at nodes/sotm0006-ps-ar.md, data/reading-room/articles/sotm0006-ps-ar.json; same title as id sotm0022-ps-ar |
| `articles/sotm0009-ie-ga.html` | `articles/sotm0009-ie-ga.html` | Moore's Forecast and Peel's Corn, 1845-1846 · The Atlas | html (article) | 36,323 B | same article id `sotm0009-ie-ga` also at nodes/sotm0009-ie-ga.md, data/reading-room/articles/sotm0009-ie-ga.json; same title as id bt03 |
| `articles/sotm0010-cn-zh.html` | `articles/sotm0010-cn-zh.html` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 · The Atlas | html (article) | 26,192 B | same article id `sotm0010-cn-zh` also at nodes/sotm0010-cn-zh.md, data/reading-room/articles/sotm0010-cn-zh.json; same title as id n04 |
| `articles/sotm0011-ie-ga.html` | `articles/sotm0011-ie-ga.html` | Trevelyan to Monteagle, 9 October 1846 · The Atlas | html (article) | 29,676 B | same article id `sotm0011-ie-ga` also at nodes/sotm0011-ie-ga.md, data/reading-room/articles/sotm0011-ie-ga.json; same title as id bt04 |
| `articles/sotm0014-ie-ga.html` | `articles/sotm0014-ie-ga.html` | de Vere's Letter, 1847 · The Atlas | html (article) | 27,866 B | same article id `sotm0014-ie-ga` also at nodes/sotm0014-ie-ga.md, data/reading-room/articles/sotm0014-ie-ga.json; same title as id bt05 |
| `articles/sotm0016-ie-ga.html` | `articles/sotm0016-ie-ga.html` | 14 Henrietta Street, 1849-1858 · The Atlas | html (article) | 25,419 B | same article id `sotm0016-ie-ga` also at nodes/sotm0016-ie-ga.md, data/reading-room/articles/sotm0016-ie-ga.json; same title as id bt06 |
| `articles/sotm0022-ps-ar.html` | `articles/sotm0022-ps-ar.html` | Ledger and Mob, Galilee, 1831–1840 | html (article) | 403 B | same title as id sotm0006-ps-ar |
| `articles/images/sotm0022-ps-ar-01-ibrahim-addresses-notables.jpg` | `articles/images/sotm0022-ps-ar-01-ibrahim-addresses-notables.jpg` |  | jpg (image) | 474,371 B |  |
| `articles/images/sotm0022-ps-ar-02-fellah-and-thomson.jpg` | `articles/images/sotm0022-ps-ar-02-fellah-and-thomson.jpg` |  | jpg (image) | 417,808 B |  |
| `articles/images/sotm0022-ps-ar-03-hasan-olive-block.jpg` | `articles/images/sotm0022-ps-ar-03-hasan-olive-block.jpg` |  | jpg (image) | 452,699 B |  |
| `articles/images/sotm0022-ps-ar-04-amina-at-tabun.jpg` | `articles/images/sotm0022-ps-ar-04-amina-at-tabun.jpg` |  | jpg (image) | 453,576 B |  |
| `articles/images/sotm0022-ps-ar-05-nizam-recruiters.jpg` | `articles/images/sotm0022-ps-ar-05-nizam-recruiters.jpg` |  | jpg (image) | 416,250 B |  |
| `articles/images/sotm0022-ps-ar-06-gate-opened-jerusalem.jpg` | `articles/images/sotm0022-ps-ar-06-gate-opened-jerusalem.jpg` |  | jpg (image) | 460,063 B |  |
| `articles/images/sotm0022-ps-ar-07-preacher-safed.jpg` | `articles/images/sotm0022-ps-ar-07-preacher-safed.jpg` |  | jpg (image) | 423,675 B |  |
| `articles/images/sotm0022-ps-ar-08-yosef-stripped-house.jpg` | `articles/images/sotm0022-ps-ar-08-yosef-stripped-house.jpg` |  | jpg (image) | 75,954 B |  |
| `articles/images/sotm0022-ps-ar-09-jisr-banat-yaqub-caravan.jpg` | `articles/images/sotm0022-ps-ar-09-jisr-banat-yaqub-caravan.jpg` |  | jpg (image) | 91,528 B |  |
| `articles/images/sotm0022-ps-ar-10-safed-roofs-evening.jpg` | `articles/images/sotm0022-ps-ar-10-safed-roofs-evening.jpg` |  | jpg (image) | 92,782 B |  |
| `articles/images/sotm0022-ps-ar-11-refugees-ein-al-zeitun.jpg` | `articles/images/sotm0022-ps-ar-11-refugees-ein-al-zeitun.jpg` |  | jpg (image) | 440,138 B |  |
| `articles/images/sotm0022-ps-ar-12-sheikh-courtyard-dusk.jpg` | `articles/images/sotm0022-ps-ar-12-sheikh-courtyard-dusk.jpg` |  | jpg (image) | 95,657 B |  |
| `articles/images/sotm0022-ps-ar-13-muhammad-ali-jaffa.jpg` | `articles/images/sotm0022-ps-ar-13-muhammad-ali-jaffa.jpg` |  | jpg (image) | 404,091 B |  |
| `articles/images/sotm0022-ps-ar-14-conscripts-roped.jpg` | `articles/images/sotm0022-ps-ar-14-conscripts-roped.jpg` |  | jpg (image) | 448,735 B |  |
| `data/reading-room/manifest.json` | `data/reading-room/manifest.json` |  | json (manifest) | 509 B |  |
| `data/reading-room/articles/bt01.json` | `data/reading-room/articles/bt01.json` | Equalization, 1801-1824 | json (article) | 8,176 B | same article id `bt01` also at .drafts-2026-11-05/articles/bt01.html, .drafts-2026-11-05/nodes/bt01.md; same title as id sotm0001-ie-en |
| `data/reading-room/articles/bt02.json` | `data/reading-room/articles/bt02.json` | Crotty's House, 1832 | json (article) | 8,179 B | same article id `bt02` also at .drafts-2026-11-05/articles/bt02.html, .drafts-2026-11-05/nodes/bt02.md; same title as id sotm0004-ie-ga |
| `data/reading-room/articles/bt03.json` | `data/reading-room/articles/bt03.json` | Moore's Forecast and Peel's Corn, 1845-1846 | json (article) | 7,104 B | same article id `bt03` also at .drafts-2026-11-05/articles/bt03.html, .drafts-2026-11-05/nodes/bt03.md; same title as id sotm0009-ie-ga |
| `data/reading-room/articles/bt04.json` | `data/reading-room/articles/bt04.json` | Trevelyan to Monteagle, 9 October 1846 | json (article) | 5,887 B | same article id `bt04` also at .drafts-2026-11-05/articles/bt04.html, .drafts-2026-11-05/nodes/bt04.md; same title as id sotm0011-ie-ga |
| `data/reading-room/articles/bt05.json` | `data/reading-room/articles/bt05.json` | de Vere's Letter, 1847 | json (article) | 5,391 B | same article id `bt05` also at .drafts-2026-11-05/articles/bt05.html, .drafts-2026-11-05/nodes/bt05.md; same title as id sotm0014-ie-ga |
| `data/reading-room/articles/bt06.json` | `data/reading-room/articles/bt06.json` | 14 Henrietta Street, 1849-1858 | json (article) | 6,098 B | same article id `bt06` also at .drafts-2026-11-05/articles/bt06.html, .drafts-2026-11-05/nodes/bt06.md; same title as id sotm0016-ie-ga |
| `data/reading-room/articles/bt07.json` | `data/reading-room/articles/bt07.json` | From the Well to the Church, 1850-1878 | json (article) | 4,738 B | same article id `bt07` also at .drafts-2026-11-05/articles/bt07.html, .drafts-2026-11-05/nodes/bt07.md; same title as id sotm0003-ie-ga |
| `data/reading-room/articles/bt08.json` | `data/reading-room/articles/bt08.json` | £10,000 of Turnips, 1880 | json (article) | 5,994 B | same article id `bt08` also at nodes/bt08.md, articles/bt08.html, .drafts-2026-11-05/articles/bt08.html |
| `data/reading-room/articles/bt09.json` | `data/reading-room/articles/bt09.json` | Hyde Resigns, Dundalk, 1915 | json (article) | 5,554 B | same article id `bt09` also at nodes/bt09.md, articles/bt09.html, .drafts-2026-11-05/articles/bt09.html |
| `data/reading-room/articles/bt10.json` | `data/reading-room/articles/bt10.json` | Eighteen Men in Under an Hour, 1903 | json (article) | 6,686 B | same article id `bt10` also at nodes/bt10.md, articles/bt10.html, .drafts-2026-11-05/articles/bt10.html |
| `data/reading-room/articles/bt11.json` | `data/reading-room/articles/bt11.json` | Howth and Bachelors Walk, 26 July 1914 | json (article) | 5,335 B | same article id `bt11` also at nodes/bt11.md, articles/bt11.html, .drafts-2026-11-05/articles/bt11.html |
| `data/reading-room/articles/bt12.json` | `data/reading-room/articles/bt12.json` | The Letter Hussein Kept, 1915-1917 | json (article) | 5,603 B | same article id `bt12` also at nodes/bt12.md, articles/bt12.html, .drafts-2026-11-05/articles/bt12.html |
| `data/reading-room/articles/bt13.json` | `data/reading-room/articles/bt13.json` | Portobello Barracks, 26 April 1916 | json (article) | 4,715 B | same article id `bt13` also at nodes/bt13.md, articles/bt13.html, .drafts-2026-11-05/articles/bt13.html |
| `data/reading-room/articles/bt14.json` | `data/reading-room/articles/bt14.json` | Great Brunswick Street, 1919-1920 | json (article) | 5,133 B | same article id `bt14` also at nodes/bt14.md, articles/bt14.html, .drafts-2026-11-05/articles/bt14.html |
| `data/reading-room/articles/bt15.json` | `data/reading-room/articles/bt15.json` | Croke Park, 21 November 1920 | json (article) | 4,537 B | same article id `bt15` also at nodes/bt15.md, articles/bt15.html, .drafts-2026-11-05/articles/bt15.html |
| `data/reading-room/articles/bt16.json` | `data/reading-room/articles/bt16.json` | Two Letters, Downing Street, 1921 | json (article) | 4,534 B | same article id `bt16` also at nodes/bt16.md, articles/bt16.html, .drafts-2026-11-05/articles/bt16.html |
| `data/reading-room/articles/bt17.json` | `data/reading-room/articles/bt17.json` | Churchill's Instruction, Spring 1922 | json (article) | 4,344 B | same article id `bt17` also at nodes/bt17.md, articles/bt17.html, .drafts-2026-11-05/articles/bt17.html |
| `data/reading-room/articles/bt18.json` | `data/reading-room/articles/bt18.json` | Duff, Jerusalem, 1922-1938 | json (article) | 4,368 B | same article id `bt18` also at nodes/bt18.md, articles/bt18.html, .drafts-2026-11-05/articles/bt18.html |
| `data/reading-room/articles/bt19.json` | `data/reading-room/articles/bt19.json` | Ya'bad to the UN, 1935-1947 | json (article) | 4,567 B | same article id `bt19` also at nodes/bt19.md, articles/bt19.html, .drafts-2026-11-05/articles/bt19.html |
| `data/reading-room/articles/n02.json` | `data/reading-room/articles/n02.json` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire | json (article) | 2,826 B | same article id `n02` also at .drafts-2026-11-05/articles/n02.html, .drafts-2026-11-05/nodes/n02.md; same title as id sotm0005-cn-zh |
| `data/reading-room/articles/n03.json` | `data/reading-room/articles/n03.json` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 | json (article) | 2,399 B | same article id `n03` also at .drafts-2026-11-05/articles/n03.html, .drafts-2026-11-05/nodes/n03.md; same title as id sotm0002-cn-zh |
| `data/reading-room/articles/n04.json` | `data/reading-room/articles/n04.json` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 | json (article) | 1,913 B | same article id `n04` also at .drafts-2026-11-05/articles/n04.html, .drafts-2026-11-05/nodes/n04.md; same title as id sotm0010-cn-zh |
| `data/reading-room/articles/n05.json` | `data/reading-room/articles/n05.json` | After the Pashas: Tanzimat, the Land Code, and the New Lords of Palestine | json (article) | 5,461 B | same article id `n05` also at nodes/n05.md, articles/n05.html, .drafts-2026-11-05/articles/n05.html |
| `data/reading-room/articles/n06.json` | `data/reading-room/articles/n06.json` | The Standard Nobody Else Meets | json (article) | 15,017 B | same article id `n06` also at nodes/n06.md, articles/n06.html, .drafts-2026-11-05/articles/n06.html |
| `data/reading-room/articles/n07.json` | `data/reading-room/articles/n07.json` | The Multazim's Register: Tulkarm's Rural Notables and the Land Code, 1858-1938 | json (article) | 7,277 B | same article id `n07` also at nodes/n07.md, articles/n07.html, .drafts-2026-11-05/articles/n07.html |
| `data/reading-room/articles/n08.json` | `data/reading-room/articles/n08.json` | Warnier's Sentence, 1873 | json (article) | 7,221 B | same article id `n08` also at nodes/n08.md, articles/n08.html, .drafts-2026-11-05/articles/n08.html |
| `data/reading-room/articles/route-60-to-the-master-fund.json` | `data/reading-room/articles/route-60-to-the-master-fund.json` | Route 60 to the Master Fund: 7 October and the Plans That Predated It | json (article) | 22,486 B |  |
| `data/reading-room/articles/sotm0001-ie-en.json` | `data/reading-room/articles/sotm0001-ie-en.json` | Equalization, 1801-1824 | json (article) | 14,649 B | same article id `sotm0001-ie-en` also at nodes/sotm0001-ie-en.md, articles/sotm0001-ie-en.html; same title as id bt01 |
| `data/reading-room/articles/sotm0002-cn-zh.json` | `data/reading-room/articles/sotm0002-cn-zh.json` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 | json (article) | 24,931 B | same article id `sotm0002-cn-zh` also at nodes/sotm0002-cn-zh.md, articles/sotm0002-cn-zh.html; same title as id n03 |
| `data/reading-room/articles/sotm0003-ie-ga.json` | `data/reading-room/articles/sotm0003-ie-ga.json` | From the Well to the Church, 1850-1878 | json (article) | 10,497 B | same article id `sotm0003-ie-ga` also at nodes/sotm0003-ie-ga.md, articles/sotm0003-ie-ga.html; same title as id bt07 |
| `data/reading-room/articles/sotm0004-ie-ga.json` | `data/reading-room/articles/sotm0004-ie-ga.json` | Crotty's House, 1832 | json (article) | 17,267 B | same article id `sotm0004-ie-ga` also at nodes/sotm0004-ie-ga.md, articles/sotm0004-ie-ga.html; same title as id bt02 |
| `data/reading-room/articles/sotm0005-cn-zh.json` | `data/reading-room/articles/sotm0005-cn-zh.json` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire | json (article) | 17,219 B | same article id `sotm0005-cn-zh` also at nodes/sotm0005-cn-zh.md, articles/sotm0005-cn-zh.html; same title as id n02 |
| `data/reading-room/articles/sotm0006-ps-ar.json` | `data/reading-room/articles/sotm0006-ps-ar.json` | Ledger and Mob, Galilee, 1831–1840 | json (article) | 63,519 B | same article id `sotm0006-ps-ar` also at nodes/sotm0006-ps-ar.md, articles/sotm0006-ps-ar.html; same title as id sotm0022-ps-ar |
| `data/reading-room/articles/sotm0009-ie-ga.json` | `data/reading-room/articles/sotm0009-ie-ga.json` | Moore's Forecast and Peel's Corn, 1845-1846 | json (article) | 19,187 B | same article id `sotm0009-ie-ga` also at nodes/sotm0009-ie-ga.md, articles/sotm0009-ie-ga.html; same title as id bt03 |
| `data/reading-room/articles/sotm0010-cn-zh.json` | `data/reading-room/articles/sotm0010-cn-zh.json` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 | json (article) | 11,533 B | same article id `sotm0010-cn-zh` also at nodes/sotm0010-cn-zh.md, articles/sotm0010-cn-zh.html; same title as id n04 |
| `data/reading-room/articles/sotm0011-ie-ga.json` | `data/reading-room/articles/sotm0011-ie-ga.json` | Trevelyan to Monteagle, 9 October 1846 | json (article) | 12,606 B | same article id `sotm0011-ie-ga` also at nodes/sotm0011-ie-ga.md, articles/sotm0011-ie-ga.html; same title as id bt04 |
| `data/reading-room/articles/sotm0014-ie-ga.json` | `data/reading-room/articles/sotm0014-ie-ga.json` | de Vere's Letter, 1847 | json (article) | 10,967 B | same article id `sotm0014-ie-ga` also at nodes/sotm0014-ie-ga.md, articles/sotm0014-ie-ga.html; same title as id bt05 |
| `data/reading-room/articles/sotm0016-ie-ga.json` | `data/reading-room/articles/sotm0016-ie-ga.json` | 14 Henrietta Street, 1849-1858 | json (article) | 8,214 B | same article id `sotm0016-ie-ga` also at nodes/sotm0016-ie-ga.md, articles/sotm0016-ie-ga.html; same title as id bt06 |
| `.drafts-2026-11-05/articles/bt01.html` | `drafts-2026-11-05/articles/bt01.html` | Equalization, 1801-1824 · The Atlas | html (article) | 24,542 B | same article id `bt01` also at data/reading-room/articles/bt01.json, .drafts-2026-11-05/nodes/bt01.md; same title as id sotm0001-ie-en |
| `.drafts-2026-11-05/articles/bt02.html` | `drafts-2026-11-05/articles/bt02.html` | Crotty's House, 1832 · The Atlas | html (article) | 23,988 B | same article id `bt02` also at data/reading-room/articles/bt02.json, .drafts-2026-11-05/nodes/bt02.md; same title as id sotm0004-ie-ga |
| `.drafts-2026-11-05/articles/bt03.html` | `drafts-2026-11-05/articles/bt03.html` | Moore's Forecast and Peel's Corn, 1845-1846 · The Atlas | html (article) | 24,113 B | same article id `bt03` also at data/reading-room/articles/bt03.json, .drafts-2026-11-05/nodes/bt03.md; same title as id sotm0009-ie-ga |
| `.drafts-2026-11-05/articles/bt04.html` | `drafts-2026-11-05/articles/bt04.html` | Trevelyan to Monteagle, 9 October 1846 · The Atlas | html (article) | 22,770 B | same article id `bt04` also at data/reading-room/articles/bt04.json, .drafts-2026-11-05/nodes/bt04.md; same title as id sotm0011-ie-ga |
| `.drafts-2026-11-05/articles/bt05.html` | `drafts-2026-11-05/articles/bt05.html` | de Vere's Letter, 1847 · The Atlas | html (article) | 22,133 B | same article id `bt05` also at data/reading-room/articles/bt05.json, .drafts-2026-11-05/nodes/bt05.md; same title as id sotm0014-ie-ga |
| `.drafts-2026-11-05/articles/bt06.html` | `drafts-2026-11-05/articles/bt06.html` | 14 Henrietta Street, 1849-1858 · The Atlas | html (article) | 23,223 B | same article id `bt06` also at data/reading-room/articles/bt06.json, .drafts-2026-11-05/nodes/bt06.md; same title as id sotm0016-ie-ga |
| `.drafts-2026-11-05/articles/bt07.html` | `drafts-2026-11-05/articles/bt07.html` | From the Well to the Church, 1850-1878 · The Atlas | html (article) | 21,393 B | same article id `bt07` also at data/reading-room/articles/bt07.json, .drafts-2026-11-05/nodes/bt07.md; same title as id sotm0003-ie-ga |
| `.drafts-2026-11-05/articles/bt08.html` | `drafts-2026-11-05/articles/bt08.html` | £10,000 of Turnips, 1880 · The Atlas | html (article) | 23,141 B | IDENTICAL bytes to articles/bt08.html; same article id `bt08` also at nodes/bt08.md, data/reading-room/articles/bt08.json |
| `.drafts-2026-11-05/articles/bt09.html` | `drafts-2026-11-05/articles/bt09.html` | Hyde Resigns, Dundalk, 1915 · The Atlas | html (article) | 23,432 B | IDENTICAL bytes to articles/bt09.html; same article id `bt09` also at nodes/bt09.md, data/reading-room/articles/bt09.json |
| `.drafts-2026-11-05/articles/bt10.html` | `drafts-2026-11-05/articles/bt10.html` | Eighteen Men in Under an Hour, 1903 · The Atlas | html (article) | 23,181 B | IDENTICAL bytes to articles/bt10.html; same article id `bt10` also at nodes/bt10.md, data/reading-room/articles/bt10.json |
| `.drafts-2026-11-05/articles/bt11.html` | `drafts-2026-11-05/articles/bt11.html` | Howth and Bachelors Walk, 26 July 1914 · The Atlas | html (article) | 22,921 B | IDENTICAL bytes to articles/bt11.html; same article id `bt11` also at nodes/bt11.md, data/reading-room/articles/bt11.json |
| `.drafts-2026-11-05/articles/bt12.html` | `drafts-2026-11-05/articles/bt12.html` | The Letter Hussein Kept, 1915-1917 · The Atlas | html (article) | 23,445 B | IDENTICAL bytes to articles/bt12.html; same article id `bt12` also at nodes/bt12.md, data/reading-room/articles/bt12.json |
| `.drafts-2026-11-05/articles/bt13.html` | `drafts-2026-11-05/articles/bt13.html` | Portobello Barracks, 26 April 1916 · The Atlas | html (article) | 22,019 B | IDENTICAL bytes to articles/bt13.html; same article id `bt13` also at nodes/bt13.md, data/reading-room/articles/bt13.json |
| `.drafts-2026-11-05/articles/bt14.html` | `drafts-2026-11-05/articles/bt14.html` | Great Brunswick Street, 1919-1920 · The Atlas | html (article) | 21,917 B | IDENTICAL bytes to articles/bt14.html; same article id `bt14` also at nodes/bt14.md, data/reading-room/articles/bt14.json |
| `.drafts-2026-11-05/articles/bt15.html` | `drafts-2026-11-05/articles/bt15.html` | Croke Park, 21 November 1920 · The Atlas | html (article) | 21,681 B | IDENTICAL bytes to articles/bt15.html; same article id `bt15` also at nodes/bt15.md, data/reading-room/articles/bt15.json |
| `.drafts-2026-11-05/articles/bt16.html` | `drafts-2026-11-05/articles/bt16.html` | Two Letters, Downing Street, 1921 · The Atlas | html (article) | 21,741 B | IDENTICAL bytes to articles/bt16.html; same article id `bt16` also at nodes/bt16.md, data/reading-room/articles/bt16.json |
| `.drafts-2026-11-05/articles/bt17.html` | `drafts-2026-11-05/articles/bt17.html` | Churchill's Instruction, Spring 1922 · The Atlas | html (article) | 21,627 B | IDENTICAL bytes to articles/bt17.html; same article id `bt17` also at nodes/bt17.md, data/reading-room/articles/bt17.json |
| `.drafts-2026-11-05/articles/bt18.html` | `drafts-2026-11-05/articles/bt18.html` | Duff, Jerusalem, 1922-1938 · The Atlas | html (article) | 20,843 B | IDENTICAL bytes to articles/bt18.html; same article id `bt18` also at nodes/bt18.md, data/reading-room/articles/bt18.json |
| `.drafts-2026-11-05/articles/bt19.html` | `drafts-2026-11-05/articles/bt19.html` | Ya'bad to the UN, 1935-1947 · The Atlas | html (article) | 21,127 B | IDENTICAL bytes to articles/bt19.html; same article id `bt19` also at nodes/bt19.md, data/reading-room/articles/bt19.json |
| `.drafts-2026-11-05/articles/index.html` | `drafts-2026-11-05/articles/index.html` |  | html (index-page) | 12,606 B |  |
| `.drafts-2026-11-05/articles/n02.html` | `drafts-2026-11-05/articles/n02.html` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire · The Atlas | html (article) | 17,311 B | same article id `n02` also at data/reading-room/articles/n02.json, .drafts-2026-11-05/nodes/n02.md; same title as id sotm0005-cn-zh |
| `.drafts-2026-11-05/articles/n03.html` | `drafts-2026-11-05/articles/n03.html` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 · The Atlas | html (article) | 16,769 B | same article id `n03` also at data/reading-room/articles/n03.json, .drafts-2026-11-05/nodes/n03.md; same title as id sotm0002-cn-zh |
| `.drafts-2026-11-05/articles/n04.html` | `drafts-2026-11-05/articles/n04.html` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 · The Atlas | html (article) | 16,296 B | same article id `n04` also at data/reading-room/articles/n04.json, .drafts-2026-11-05/nodes/n04.md; same title as id sotm0010-cn-zh |
| `.drafts-2026-11-05/articles/n05.html` | `drafts-2026-11-05/articles/n05.html` | After the Pashas: Tanzimat, the Land Code, and the New Lords of Palestine · The Atlas | html (article) | 19,936 B | IDENTICAL bytes to articles/n05.html; same article id `n05` also at nodes/n05.md, data/reading-room/articles/n05.json |
| `.drafts-2026-11-05/articles/n06.html` | `drafts-2026-11-05/articles/n06.html` | The Standard Nobody Else Meets · The Atlas | html (article) | 30,178 B | IDENTICAL bytes to articles/n06.html; same article id `n06` also at nodes/n06.md, data/reading-room/articles/n06.json |
| `.drafts-2026-11-05/articles/n07.html` | `drafts-2026-11-05/articles/n07.html` | The Multazim's Register: Tulkarm's Rural Notables and the Land Code, 1858-1938 · The Atlas | html (article) | 22,693 B | IDENTICAL bytes to articles/n07.html; same article id `n07` also at nodes/n07.md, data/reading-room/articles/n07.json |
| `.drafts-2026-11-05/articles/n08.html` | `drafts-2026-11-05/articles/n08.html` | Warnier's Sentence, 1873 · The Atlas | html (article) | 24,801 B | same article id `n08` also at nodes/n08.md, articles/n08.html, data/reading-room/articles/n08.json |
| `.drafts-2026-11-05/nodes/bt01.md` | `drafts-2026-11-05/nodes/bt01.md` | Equalization, 1801-1824 | md (article) | 9,314 B | same article id `bt01` also at data/reading-room/articles/bt01.json, .drafts-2026-11-05/articles/bt01.html; same title as id sotm0001-ie-en |
| `.drafts-2026-11-05/nodes/bt02.md` | `drafts-2026-11-05/nodes/bt02.md` | Crotty's House, 1832 | md (article) | 9,182 B | same article id `bt02` also at data/reading-room/articles/bt02.json, .drafts-2026-11-05/articles/bt02.html; same title as id sotm0004-ie-ga |
| `.drafts-2026-11-05/nodes/bt03.md` | `drafts-2026-11-05/nodes/bt03.md` | Moore's Forecast and Peel's Corn, 1845-1846 | md (article) | 8,761 B | same article id `bt03` also at data/reading-room/articles/bt03.json, .drafts-2026-11-05/articles/bt03.html; same title as id sotm0009-ie-ga |
| `.drafts-2026-11-05/nodes/bt04.md` | `drafts-2026-11-05/nodes/bt04.md` | Trevelyan to Monteagle, 9 October 1846 | md (article) | 7,559 B | same article id `bt04` also at data/reading-room/articles/bt04.json, .drafts-2026-11-05/articles/bt04.html; same title as id sotm0011-ie-ga |
| `.drafts-2026-11-05/nodes/bt05.md` | `drafts-2026-11-05/nodes/bt05.md` | de Vere's Letter, 1847 | md (article) | 6,972 B | same article id `bt05` also at data/reading-room/articles/bt05.json, .drafts-2026-11-05/articles/bt05.html; same title as id sotm0014-ie-ga |
| `.drafts-2026-11-05/nodes/bt06.md` | `drafts-2026-11-05/nodes/bt06.md` | 14 Henrietta Street, 1849-1858 | md (article) | 7,922 B | same article id `bt06` also at data/reading-room/articles/bt06.json, .drafts-2026-11-05/articles/bt06.html; same title as id sotm0016-ie-ga |
| `.drafts-2026-11-05/nodes/bt07.md` | `drafts-2026-11-05/nodes/bt07.md` | From the Well to the Church, 1850-1878 | md (article) | 6,310 B | same article id `bt07` also at data/reading-room/articles/bt07.json, .drafts-2026-11-05/articles/bt07.html; same title as id sotm0003-ie-ga |
| `.drafts-2026-11-05/nodes/n02.md` | `drafts-2026-11-05/nodes/n02.md` | The Fiscal Hinge: Opium, the Bengal Monopoly, and the Liquidity of Empire | md (article) | 2,898 B | same article id `n02` also at data/reading-room/articles/n02.json, .drafts-2026-11-05/articles/n02.html; same title as id sotm0005-cn-zh |
| `.drafts-2026-11-05/nodes/n03.md` | `drafts-2026-11-05/nodes/n03.md` | The Yaokou and the Fast Crabs: Distribution Inside China, 1821-1839 | md (article) | 2,482 B | same article id `n03` also at data/reading-room/articles/n03.json, .drafts-2026-11-05/articles/n03.html; same title as id sotm0002-cn-zh |
| `.drafts-2026-11-05/nodes/n04.md` | `drafts-2026-11-05/nodes/n04.md` | Poppies, Clans, and Smoke: Domestic Cultivation and Terminal Consumption in China, 1820s-1839 | md (article) | 1,946 B | same article id `n04` also at data/reading-room/articles/n04.json, .drafts-2026-11-05/articles/n04.html; same title as id sotm0010-cn-zh |

## Not copied, on purpose

- `data/events.json`: the Atlas globe data file. It is generated from `nodes/*.md` and contains the same text, so it is not a separate article.
- `hoffect/research/pdfs/*.pdf`: a third-party press release used as research for the Hoffect tool, not one of your articles.
- App and dossier pages (GASPI, Gaza, Atlas, tools, `apps/`): these are interactive pages, not reading-room articles.
- The taken-down chapter 22 versions live only on the branch `archive/ch22-takedown-2026-11-17`. They stay off the public site, as you asked.

## Removed from the site earlier (still in git history, not copied)

These were deleted from `main` in past commits. Nothing is lost: any of them can be recovered with `git show <commit>^:<path> > file`. They were not copied back here so that nothing taken down becomes public again.

| Path | Deleted in commit (date) |
|---|---|
| `.drafts-2026-11-05/articles/n01-ar.html` | 2ab7d37 2026-11-17 |
| `.drafts-2026-11-05/articles/n01-he.html` | 2ab7d37 2026-11-17 |
| `.drafts-2026-11-05/articles/n01.html` | 2ab7d37 2026-11-17 |
| `.drafts-2026-11-05/nodes/n01.md` | 2ab7d37 2026-11-17 |
| `articles/article1_smith_singularity.md` | c5fade6 2026-06-24 |
| `articles/article2_first_breath.md` | c5fade6 2026-06-24 |
| `articles/article3_maya.md` | c5fade6 2026-06-24 |
| `articles/article4_frequency.md` | c5fade6 2026-06-24 |
| `articles/article5_the_spark.md` | c5fade6 2026-06-24 |
| `articles/blankcheck.html` | c5fade6 2026-06-24 |
| `articles/codex/index.html` | c5fade6 2026-06-24 |
| `articles/diaspora-70ce.html` | 594f653 2026-07-01 |
| `articles/florida_str_dashboard/airbnbstrategy.md` | c5fade6 2026-06-24 |
| `articles/florida_str_dashboard/index.html` | c5fade6 2026-06-24 |
| `articles/frequency/FrequencyFoundationsTheVibrationarchitecture.html` | c5fade6 2026-06-24 |
| `articles/kiev-cookbook/index.html` | b83b77e 2026-05-14 |
| `articles/kievcookery/index.html` | c5fade6 2026-06-24 |
| `articles/land-code-1858.html` | 594f653 2026-07-01 |
| `articles/mao-1966.html` | 594f653 2026-07-01 |
| `articles/maya/mayasmirror.html` | c5fade6 2026-06-24 |
| `articles/metabolic-research-app/index.html` | c5fade6 2026-06-24 |
| `articles/n01-ar.html` | 2ab7d37 2026-11-17 |
| `articles/n01-he.html` | 2ab7d37 2026-11-17 |
| `articles/n03.html` | b6f1ef5 2026-11-05 |
| `articles/opium-wars-1839.html` | 594f653 2026-07-01 |
| `articles/pagestreetmeats/cookingonpagestreet.html` | c5fade6 2026-06-24 |
| `articles/patriot-act-2001.html` | 594f653 2026-07-01 |
| `articles/saving_private_MD/nitrogenfarmersguide.html` | c5fade6 2026-06-24 |
| `articles/skid-row-1976.html` | 594f653 2026-07-01 |
| `articles/veil/veilofbabel.html` | c5fade6 2026-06-24 |
| `articles/war-on-drugs-1971.html` | 594f653 2026-07-01 |
| `articles/west-bank-1967.html` | 594f653 2026-07-01 |
| `data/reading-room/articles/n01-ar.json` | 2ab7d37 2026-11-17 |
| `data/reading-room/articles/n01-he.json` | 2ab7d37 2026-11-17 |
| `data/reading-room/articles/n01.json` | 2ab7d37 2026-11-17 |
| `nodes/diaspora-70ce.md` | cb4e8e7 2026-07-01 |
| `nodes/land-code-1858.md` | aa37a18 2026-07-01 |
| `nodes/mao-1966.md` | 6333567 2026-07-01 |
| `nodes/n01-ar.md` | 2ab7d37 2026-11-17 |
| `nodes/n01-he.md` | 2ab7d37 2026-11-17 |
| `nodes/opium-wars-1839.md` | 8952025 2026-07-01 |
| `nodes/patriot-act-2001.md` | 8897f7f 2026-07-01 |
| `nodes/skid-row-1976.md` | 68a7bfb 2026-07-01 |
| `nodes/war-on-drugs-1971.md` | 61e8773 2026-07-01 |
| `nodes/west-bank-1967.md` | 9d07357 2026-07-01 |
