export type EclipseRow = {
  solar: boolean;
  kind: string;
  time: number;
  lat: number | null;
  lon: number | null;
};

export const FAMOUS: { id: string; name: string; time: string; note: string }[] = [
  { id: "ugarit", name: "Ugarit", time: "-001374-05-03T04:51:00Z", note: "Early clay-tablet solar report" },
  { id: "thales", name: "Thales", time: "-000584-05-28T14:22:00Z", note: "The battle that Herodotus says stopped" },
  { id: "henry", name: "Henry I", time: "1133-08-02T12:08:00Z", note: "Totality over England" },
  { id: "halley", name: "Halley", time: "1715-05-03T09:36:00Z", note: "Path predicted across England" },
  { id: "eddington", name: "Eddington", time: "1919-05-29T13:08:00Z", note: "Starlight and general relativity" },
  { id: "nyc", name: "New York", time: "1925-01-24T14:53:00Z", note: "Totality across the city" },
  { id: "us2017", name: "2017", time: "2017-08-21T18:26:40Z", note: "Coast to coast" },
  { id: "us2024", name: "2024", time: "2024-04-08T18:17:19Z", note: "Mexico, the Midwest, eastern Canada" },
];

export function parseCatalogInstant(iso: string): number {
  const neg = iso.startsWith("-");
  const s = neg ? iso.slice(1) : iso;
  const tIdx = s.indexOf("T");
  const ymd = s.slice(0, tIdx);
  const hms = s.slice(tIdx + 1).replace("Z", "");
  const [ys, ms, ds] = ymd.split("-");
  const year = (neg ? -1 : 1) * parseInt(ys, 10);
  const month = parseInt(ms, 10);
  const day = parseInt(ds, 10);
  const [h, m, sec] = hms.split(":").map(Number);
  return Date.UTC(year, month - 1, day, h || 0, m || 0, sec || 0);
}

let pending: Promise<EclipseRow[]> | null = null;

export function loadEclipses(): Promise<EclipseRow[]> {
  if (!pending) {
    const catalog = `${import.meta.env.BASE_URL}data/eclipses.json`;
    pending = fetch(catalog)
      .then((r) => {
        if (!r.ok) throw new Error("Eclipse catalog failed to load");
        return r.json() as Promise<unknown[]>;
      })
      .then((rows) => {
        const out: EclipseRow[] = [];
        for (const row of rows) {
          if (!Array.isArray(row) || row.length < 3) continue;
          const solar = row[0] === "S";
          const kind = String(row[1] ?? "");
          const time = parseCatalogInstant(String(row[2]));
          if (!Number.isFinite(time)) continue;
          const lat = typeof row[3] === "number" ? row[3] : null;
          const lon = typeof row[4] === "number" ? row[4] : null;
          out.push({ solar, kind, time, lat, lon });
        }
        out.sort((a, b) => a.time - b.time);
        return out;
      });
  }
  return pending;
}

function bound(rows: EclipseRow[], t: number, lower: boolean) {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lower ? rows[mid].time < t : rows[mid].time <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function eclipsesBetween(
  rows: EclipseRow[],
  startMs: number,
  endMs: number,
  pred: (row: EclipseRow) => boolean,
  limit = 80,
): { hits: EclipseRow[]; total: number } {
  const a = bound(rows, startMs, true);
  const b = bound(rows, endMs, false);
  const hits: EclipseRow[] = [];
  let total = 0;
  for (let i = a; i < b; i++) {
    if (!pred(rows[i])) continue;
    total++;
    if (hits.length < limit) hits.push(rows[i]);
  }
  return { hits, total };
}
