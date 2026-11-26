import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ORRERY } from "@/sim/bodies";
import {
  FAMOUS,
  eclipsesBetween,
  loadEclipses,
  parseCatalogInstant,
  type EclipseRow,
} from "@/sim/eclipses";
import { buildChart } from "@/sim/chart";
import lettersData from "@/sim/letters.json";
import { clock, useCosmos, view, type Mode, type Panel } from "@/sim/store";
import { useSimTime } from "@/sim/useSimTime";

type Letter = {
  id: string;
  title: string;
  year: number;
  month: number;
  day: number;
  lat: number;
  lon: number;
  place: string;
  excerpt: string;
};

const LETTERS = lettersData as Letter[];

const SPEEDS = [1, 7, 20, 365, 3650];

function pad(n: number, w = 2) {
  return String(Math.abs(n)).padStart(w, "0");
}

function formatSimDate(t: number) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  if (y <= 0) return `${1 - y} BCE ${mon} ${day}  ${hh}:${mm} UTC`;
  return `${y} ${mon} ${day}  ${hh}:${mm} UTC`;
}

function jumpTo(t: number) {
  clock.t = t;
}

function focusId(id: string) {
  const body = ORRERY.find((b) => b.id === id);
  useCosmos.getState().setFocus(id);
  view.autodolly = true;
  view.focusDistance = id === "sun" ? 16 : Math.max(1.15, (body?.radius ?? 0.14) * 9);
  if (id === "moon") view.focusDistance = 1.15;
}

function kindLabel(row: EclipseRow) {
  const type = row.solar ? "Solar" : "Lunar";
  return row.kind ? `${type} · ${row.kind}` : type;
}

export function Hud() {
  const t = useSimTime(4);
  const mode = useCosmos((s) => s.mode);
  const focus = useCosmos((s) => s.focus);
  const panel = useCosmos((s) => s.panel);
  const playing = useCosmos((s) => s.playing);
  const daysPerSecond = useCosmos((s) => s.daysPerSecond);
  const place = useCosmos((s) => s.place);
  const lat = useCosmos((s) => s.lat);
  const lon = useCosmos((s) => s.lon);
  const note = useCosmos((s) => s.note);
  const showOrbits = useCosmos((s) => s.showOrbits);
  const showZodiac = useCosmos((s) => s.showZodiac);
  const showWells = useCosmos((s) => s.showWells);
  const showOumuamua = useCosmos((s) => s.showOumuamua);
  const showPlanet9 = useCosmos((s) => s.showPlanet9);
  const eclipseWide = useCosmos((s) => s.eclipseWide);
  const chartOn = useCosmos((s) => s.chartOn);
  const patch = useCosmos((s) => s.patch);
  const setMode = useCosmos((s) => s.setMode);

  const [catalog, setCatalog] = useState<EclipseRow[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    loadEclipses()
      .then((rows) => setCatalog(rows))
      .catch((err) => setCatalogError(err instanceof Error ? err.message : "Catalog failed"));
  }, []);

  const nearby = useMemo(() => {
    if (!catalog) return [];
    const year = 365.25 * 86400000;
    return eclipsesBetween(catalog, t - year * 2, t + year * 8, () => true, 24).hits;
  }, [catalog, t]);

  const chart = useMemo(() => {
    if (mode !== "chart" && panel !== "chart") return null;
    try {
      return buildChart(new Date(t), lat, lon);
    } catch {
      return null;
    }
  }, [t, lat, lon, mode, panel]);

  const togglePanel = (next: Panel) => {
    patch({ panel: panel === next ? "none" : next });
  };

  const goMode = (next: Mode) => {
    if (next === "chart") {
      setMode("chart");
      patch({ chartOn: true, panel: "chart" });
    } else if (next === "eclipse") {
      setMode("eclipse");
      patch({ panel: "eclipses" });
    } else {
      setMode("system");
    }
  };

  const openLetter = (letter: Letter) => {
    const year = letter.year;
    jumpTo(Date.UTC(year, letter.month - 1, letter.day, 12, 0, 0));
    patch({
      lat: letter.lat,
      lon: letter.lon,
      place: letter.place,
      panel: "letters",
      note: {
        kicker: letter.place,
        title: letter.title,
        body: letter.excerpt,
      },
    });
  };

  const openFamous = (item: (typeof FAMOUS)[number]) => {
    jumpTo(parseCatalogInstant(item.time));
    setMode("eclipse");
    patch({
      panel: "eclipses",
      note: { kicker: "Famous eclipse", title: item.name, body: item.note },
    });
  };

  const openEclipse = (row: EclipseRow) => {
    jumpTo(row.time);
    setMode("eclipse");
    patch({
      panel: "eclipses",
      lat: row.lat ?? lat,
      lon: row.lon ?? lon,
      note: {
        kicker: kindLabel(row),
        title: formatSimDate(row.time),
        body: row.lat != null && row.lon != null
          ? `Path near ${row.lat.toFixed(1)}°, ${row.lon.toFixed(1)}°.`
          : "Position not recorded in the catalog.",
      },
    });
  };

  return (
    <div className="hud">
      <header className="topbar">
        <div className="brand">
          <strong>Solar Experience</strong>
          <span>{formatSimDate(t)}</span>
        </div>
        <div className="modes">
          {(["system", "eclipse", "chart"] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} onClick={() => goMode(m)}>
              {m}
            </button>
          ))}
        </div>
        <div className="transport">
          <button onClick={() => patch({ playing: !playing })}>{playing ? "Pause" : "Play"}</button>
          {SPEEDS.map((s) => (
            <button key={s} className={daysPerSecond === s ? "on" : ""} onClick={() => patch({ daysPerSecond: s, playing: true })}>
              {s === 1 ? "1 d/s" : s === 7 ? "wk" : s === 20 ? "20 d" : s === 365 ? "yr" : "dec"}
            </button>
          ))}
          <button onClick={() => jumpTo(Date.now())}>Now</button>
        </div>
      </header>

      <nav className="focus-row">
        {ORRERY.map((b) => (
          <button key={b.id} className={focus === b.id ? "on" : ""} onClick={() => focusId(b.id)} style={{ "--swatch": b.color } as CSSProperties}>
            {b.label}
          </button>
        ))}
        <button className={focus === "moon" ? "on" : ""} onClick={() => focusId("moon")}>
          Moon
        </button>
      </nav>

      <aside className="toggles">
        <label><input type="checkbox" checked={showOrbits} onChange={(e) => patch({ showOrbits: e.target.checked })} /> Orbits</label>
        <label><input type="checkbox" checked={showZodiac} onChange={(e) => patch({ showZodiac: e.target.checked })} /> Zodiac</label>
        <label><input type="checkbox" checked={showWells} onChange={(e) => patch({ showWells: e.target.checked })} /> Wells</label>
        <label><input type="checkbox" checked={showOumuamua} onChange={(e) => patch({ showOumuamua: e.target.checked })} /> ʻOumuamua</label>
        <label><input type="checkbox" checked={showPlanet9} onChange={(e) => patch({ showPlanet9: e.target.checked })} /> Planet 9</label>
      </aside>

      <div className="panel-tabs">
        {(["time", "eclipses", "letters", "chart"] as Panel[]).map((p) => (
          <button key={p} className={panel === p ? "on" : ""} onClick={() => togglePanel(p)}>
            {p}
          </button>
        ))}
      </div>

      {panel !== "none" && (
        <section className="panel">
          {panel === "time" && (
            <TimePanel
              t={t}
              lat={lat}
              lon={lon}
              place={place}
              onJump={jumpTo}
              onPlace={(next) => patch(next)}
            />
          )}
          {panel === "eclipses" && (
            <div className="stack">
              <div className="row">
                <label>
                  <input type="checkbox" checked={eclipseWide} onChange={(e) => patch({ eclipseWide: e.target.checked })} />
                  Wide view
                </label>
              </div>
              <h3>Famous</h3>
              <ul className="list">
                {FAMOUS.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => openFamous(item)}>
                      <strong>{item.name}</strong>
                      <span>{item.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <h3>Nearby in the catalog</h3>
              {catalogError && <p className="err">{catalogError}</p>}
              {!catalog && !catalogError && <p>Loading catalog…</p>}
              {catalog && (
                <ul className="list">
                  {nearby.map((row) => (
                    <li key={`${row.solar}-${row.time}`}>
                      <button onClick={() => openEclipse(row)}>
                        <strong>{kindLabel(row)}</strong>
                        <span>{formatSimDate(row.time)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {panel === "letters" && (
            <ul className="list">
              {LETTERS.map((letter) => (
                <li key={letter.id}>
                  <button onClick={() => openLetter(letter)}>
                    <strong>{letter.title}</strong>
                    <span>{letter.year > 0 ? letter.year : `${1 - letter.year} BCE`} · {letter.place}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {panel === "chart" && (
            <div className="stack">
              <div className="row">
                <label>
                  <input type="checkbox" checked={chartOn} onChange={(e) => patch({ chartOn: e.target.checked, mode: "chart" })} />
                  Show sky lines
                </label>
                <button onClick={() => goMode("chart")}>Open chart view</button>
              </div>
              <p className="meta">{place} · {lat.toFixed(3)}°, {lon.toFixed(3)}°</p>
              {chart && (
                <>
                  <h3>Bodies</h3>
                  <ul className="chart-bodies">
                    {chart.bodies.map((b) => (
                      <li key={b.id}>
                        <strong>{b.label}</strong>
                        <span>lon {b.elon.toFixed(1)}° · alt {b.altitude.toFixed(1)}°</span>
                      </li>
                    ))}
                  </ul>
                  <h3>Aspects</h3>
                  {chart.aspects.length === 0 && <p>None inside orb.</p>}
                  <ul className="chart-bodies">
                    {chart.aspects.map((a) => (
                      <li key={`${a.a}-${a.b}-${a.name}`}>
                        <strong style={{ color: a.color }}>{a.name}</strong>
                        <span>{a.a} · {a.b} ({a.delta.toFixed(1)}°)</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {note && (
        <article className="note">
          <button className="close" onClick={() => patch({ note: null })} aria-label="Close note">
            ×
          </button>
          <p className="kicker">{note.kicker}</p>
          <h2>{note.title}</h2>
          <p>{note.body}</p>
        </article>
      )}
    </div>
  );
}

function TimePanel({
  t,
  lat,
  lon,
  place,
  onJump,
  onPlace,
}: {
  t: number;
  lat: number;
  lon: number;
  place: string;
  onJump: (t: number) => void;
  onPlace: (next: { lat?: number; lon?: number; place?: string }) => void;
}) {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const shift = (ms: number) => onJump(t + ms);

  return (
    <div className="stack">
      <div className="row wrap">
        <button onClick={() => shift(-365.25 * 86400000 * 100)}>−100y</button>
        <button onClick={() => shift(-365.25 * 86400000)}>−1y</button>
        <button onClick={() => shift(-86400000)}>−1d</button>
        <button onClick={() => shift(-3600000)}>−1h</button>
        <button onClick={() => shift(3600000)}>+1h</button>
        <button onClick={() => shift(86400000)}>+1d</button>
        <button onClick={() => shift(365.25 * 86400000)}>+1y</button>
        <button onClick={() => shift(365.25 * 86400000 * 100)}>+100y</button>
      </div>
      <label className="field">
        Year (UTC)
        <input
          type="number"
          value={y}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next)) return;
            const copy = new Date(t);
            copy.setUTCFullYear(next);
            onJump(copy.getTime());
          }}
        />
      </label>
      <label className="field">
        Place
        <input value={place} onChange={(e) => onPlace({ place: e.target.value })} />
      </label>
      <div className="row">
        <label className="field">
          Lat
          <input
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => onPlace({ lat: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Lon
          <input
            type="number"
            step="0.0001"
            value={lon}
            onChange={(e) => onPlace({ lon: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
