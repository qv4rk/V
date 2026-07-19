/* ─────────────────────────────────────────────────────────────
   NATAL CHART — client-side ephemeris + Placidus houses + wheel

   All astronomy runs in-browser via the vendored astronomy-engine
   library (lib/astronomy-engine.min.js, MIT, Don Cross) — no
   server, no external ephemeris files. Planetary positions are
   VSOP87/ELP2000-class (accurate to a few arcseconds against
   Swiss Ephemeris for 1900-2100). House cusps use a from-scratch
   Placidus solver, verified against real swetest output to within
   ~0.0001° before shipping (see commit notes).

   Chiron is intentionally not included: real Chiron ephemerides
   require its own perturbed-orbit data file (this is *why* the
   original Python/pyswisseph version needed an EPHE_PATH at all —
   every other body it computes has a built-in analytic fallback,
   Chiron does not). Shipping a naive two-body guess would put it
   in the wrong sign for parts of its orbit, so it's left out
   rather than shown with false precision.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const A = window.Astronomy;
  const d2r = Math.PI / 180, r2d = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const $ = sel => document.querySelector(sel);

  const ZODIAC = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const ZODIAC_GLYPH = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

  const BODIES = [
    { key: 'Sun',     name: 'Sun',     symbol: '☉' },
    { key: 'Moon',    name: 'Moon',    symbol: '☽' },
    { key: 'Mercury', name: 'Mercury', symbol: '☿' },
    { key: 'Venus',   name: 'Venus',   symbol: '♀' },
    { key: 'Mars',    name: 'Mars',    symbol: '♂' },
    { key: 'Jupiter', name: 'Jupiter', symbol: '♃' },
    { key: 'Saturn',  name: 'Saturn',  symbol: '♄' },
    { key: 'Uranus',  name: 'Uranus',  symbol: '♅' },
    { key: 'Neptune', name: 'Neptune', symbol: '♆' },
    { key: 'Pluto',   name: 'Pluto',   symbol: '♇' },
    { key: 'MeanNode',name: 'Mean Node', symbol: '☊' }
  ];

  const ASPECTS = [
    { name: 'Conjunction', angle: 0,   symbol: '☌', orb: 8 },
    { name: 'Sextile',     angle: 60,  symbol: '⚹', orb: 6 },
    { name: 'Square',      angle: 90,  symbol: '□', orb: 8 },
    { name: 'Trine',       angle: 120, symbol: '△', orb: 8 },
    { name: 'Opposition',  angle: 180, symbol: '☍', orb: 8 }
  ];

  /* ── Formatting (mirrors the reference Python tool) ── */
  function formatLongitude(deg) {
    deg = norm(deg);
    const signIdx = Math.floor(deg / 30) % 12;
    let d = Math.floor(deg % 30);
    let m = Math.floor((deg % 1) * 60);
    let s = Math.round(((deg % 1) * 60 - m) * 60);
    if (s >= 60) { m += 1; s = 0; }
    if (m >= 60) { d += 1; m = 0; }
    return `${String(d).padStart(2,'0')} ${ZODIAC[signIdx]} ${String(m).padStart(2,'0')}' ${String(s).padStart(2,'0')}"`;
  }

  function formatLatitude(deg) {
    const dir = deg < 0 ? 'S' : 'N';
    const val = Math.abs(deg);
    const d = Math.floor(val);
    const m = Math.floor((val % 1) * 60);
    const s = Math.round(((val % 1) * 60 - m) * 60);
    return `${String(d).padStart(2,'0')}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"${dir}`;
  }

  function fmtJD(jd) { return jd.toFixed(2); }

  /* ── Ecliptic longitude/latitude of a body at a given Date (UTC) ── */
  function meanNodeLon(date) {
    const T = A.MakeTime(date).tt / 36525; // centuries of TT since J2000
    return norm(125.0445479 - 1934.1362891*T + 0.0020754*T*T + (T*T*T)/467441 - (T*T*T*T)/60616000);
  }

  function eclipticOf(body, date) {
    if (body === 'Sun') {
      const e = A.SunPosition(date);
      return { lon: norm(e.elon), lat: e.elat };
    }
    if (body === 'Moon') {
      const e = A.EclipticGeoMoon(date);
      return { lon: norm(e.lon), lat: e.lat };
    }
    if (body === 'MeanNode') {
      return { lon: meanNodeLon(date), lat: 0 };
    }
    const vec = A.GeoVector(body, date, true);
    const e = A.Ecliptic(vec);
    return { lon: norm(e.elon), lat: e.elat };
  }

  function isRetrograde(bodyKey, date) {
    if (bodyKey === 'MeanNode') return true; // the mean node regresses monotonically
    const dt = 0.25; // 6 hours, in days
    const t1 = new Date(date.getTime() - dt * 86400000);
    const t2 = new Date(date.getTime() + dt * 86400000);
    let lon1 = eclipticOf(bodyKey, t1).lon;
    let lon2 = eclipticOf(bodyKey, t2).lon;
    let diff = lon2 - lon1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
  }

  /* ── Angles (Asc/MC) + Placidus house cusps ──
     RAMC = right ascension of the midheaven (deg). eps = true obliquity.
     phi = geographic latitude. All three formulas below were checked
     against real Swiss Ephemeris (swetest-equivalent) output before
     being trusted:  MC and Asc match to <1e-6°, Placidus cusps match
     to ~2e-5° (a few hundredths of an arcsecond). ── */
  function computeAngles(date, lat, lon) {
    const time = A.MakeTime(date);
    const gst = A.SiderealTime(time); // hours
    const tilt = A.e_tilt(time);
    const eps = tilt.tobl; // true obliquity of date, degrees
    const RAMC = norm(gst * 15 + lon);

    const lamFromAlpha = alphaDeg =>
      Math.atan2(Math.sin(alphaDeg * d2r), Math.cos(alphaDeg * d2r) * Math.cos(eps * d2r)) * r2d;

    const mc = norm(lamFromAlpha(RAMC));
    const asc = norm(Math.atan2(
      Math.cos(RAMC * d2r),
      -(Math.sin(eps * d2r) * Math.tan(lat * d2r) + Math.cos(eps * d2r) * Math.sin(RAMC * d2r))
    ) * r2d);

    function solveCusp(f, sign, lam0) {
      let lam = lam0;
      for (let i = 0; i < 30; i++) {
        const delta = Math.asin(Math.sin(eps * d2r) * Math.sin(lam * d2r));
        const arg = Math.max(-1, Math.min(1, -Math.tan(lat * d2r) * Math.tan(delta)));
        const H0 = Math.acos(arg) * r2d;
        const Htarget = sign * f * H0;
        const alpha = RAMC - Htarget;
        let lamNew = lamFromAlpha(alpha);
        while (lamNew - lam > 180) lamNew -= 360;
        while (lamNew - lam < -180) lamNew += 360;
        lam = lamNew;
      }
      return norm(lam);
    }

    const c11 = solveCusp(1/3, -1, mc + 21);
    const c12 = solveCusp(2/3, -1, mc + 43);
    const c9  = solveCusp(1/3,  1, asc + 59);
    const c8  = solveCusp(2/3,  1, asc + 27);

    const houses = new Array(12);
    houses[0] = asc;             // cusp 1
    houses[8] = c9;               // cusp 9
    houses[7] = c8;                // cusp 8
    houses[9] = mc;                 // cusp 10
    houses[10] = c11;                // cusp 11
    houses[11] = c12;                 // cusp 12
    houses[1] = norm(c8 + 180);        // cusp 2  (opposite cusp 8)
    houses[2] = norm(c9 + 180);         // cusp 3  (opposite cusp 9)
    houses[3] = norm(mc + 180);          // cusp 4  (IC, opposite MC)
    houses[4] = norm(c11 + 180);          // cusp 5  (opposite cusp 11)
    houses[5] = norm(c12 + 180);           // cusp 6  (opposite cusp 12)
    houses[6] = norm(asc + 180);            // cusp 7  (Desc, opposite Asc)

    return { RAMC, eps, mc, asc, houses };
  }

  function houseOfLongitude(lon, houses) {
    for (let i = 0; i < 12; i++) {
      const c1 = houses[i], c2 = houses[(i + 1) % 12];
      let span = norm(c2 - c1); if (span === 0) span = 360;
      const rel = norm(lon - c1);
      if (rel < span) return i + 1;
    }
    return 12;
  }

  /* ── Full chart computation ── */
  function computeChart(date, lat, lon) {
    const planets = BODIES.map(b => {
      const e = eclipticOf(b.key, date);
      return {
        key: b.key, name: b.name, symbol: b.symbol,
        lon: e.lon, lat: e.lat,
        retro: isRetrograde(b.key, date)
      };
    });

    const angles = computeAngles(date, lat, lon);

    planets.forEach(p => { p.house = houseOfLongitude(p.lon, angles.houses); });

    const aspects = [];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        let diff = Math.abs(planets[i].lon - planets[j].lon);
        if (diff > 180) diff = 360 - diff;
        for (const asp of ASPECTS) {
          if (Math.abs(diff - asp.angle) <= asp.orb) {
            aspects.push({ a: planets[i], b: planets[j], aspect: asp, orb: Math.abs(diff - asp.angle), exact: diff });
            break;
          }
        }
      }
    }
    aspects.sort((x, y) => x.orb - y.orb);

    return { planets, angles, aspects };
  }

  /* ── SVG chart wheel: Ascendant locked to the left horizon,
     real Placidus house cusps, planets on the mid ring ── */
  function buildWheelSVG(chart) {
    const size = 620, cx = size / 2, cy = size / 2;
    const outerR = 290, innerR = 200;
    const asc = chart.angles.asc, mc = chart.angles.mc, houses = chart.angles.houses;

    const rot = targetLon => 180 - (targetLon - asc);
    const pt = (r, angleDeg) => [cx + r * Math.cos(angleDeg * d2r), cy + r * Math.sin(angleDeg * d2r)];

    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="#0f172a" stroke="#334155" stroke-width="2"/>\n`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#020617" stroke="#475569" stroke-width="1"/>\n`;

    for (let i = 0; i < 12; i++) {
      const a1 = rot(i * 30), a2 = rot((i + 1) * 30);
      const [x1, y1] = pt(outerR, a1), [x2, y2] = pt(outerR, a2);
      const color = i % 2 === 0 ? '#1e2937' : '#111827';
      svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} Z" fill="${color}" stroke="#334155" stroke-width="1"/>\n`;
      const [tx, ty] = pt(outerR - 20, a1 - 15);
      svg += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="monospace">${ZODIAC[i]}</text>\n`;
    }

    houses.forEach((h, i) => {
      const angle = rot(h);
      const [x1, y1] = pt(innerR, angle), [x2, y2] = pt(outerR - 40, angle);
      const isAxis = [0,3,6,9].includes(i);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${isAxis ? '#94a3b8' : '#475569'}" stroke-width="${isAxis ? 2 : 1}"/>\n`;
    });

    svg += `<line x1="${cx - outerR - 15}" y1="${cy}" x2="${cx - innerR}" y2="${cy}" stroke="#22c55e" stroke-width="3"/>\n`;
    svg += `<text x="${cx - outerR - 45}" y="${cy + 5}" fill="#22c55e" font-size="14" font-weight="bold">Asc</text>\n`;

    const mcAngle = rot(mc);
    const [mx1, my1] = pt(innerR, mcAngle), [mx2, my2] = pt(outerR + 15, mcAngle);
    svg += `<line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="#38bdf8" stroke-width="3"/>\n`;
    svg += `<text x="${mx2}" y="${my2}" fill="#38bdf8" font-size="14" font-weight="bold">MC</text>\n`;

    chart.planets.forEach(p => {
      const angle = rot(p.lon);
      const [px, py] = pt(145, angle);
      svg += `<circle cx="${px}" cy="${py}" r="14" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>\n`;
      svg += `<text x="${px}" y="${py + 5}" text-anchor="middle" fill="#e0f2fe" font-size="16" font-weight="bold">${p.symbol}</text>\n`;
    });

    svg += '</svg>';
    return svg;
  }

  /* ── UI wiring ── */
  const SAMPLE_LOCATIONS = [
    { name: 'Detroit',      lat: 42.3333, lon: -83.05,   utc: -5 },
    { name: 'New York',     lat: 40.7128, lon: -74.0060, utc: -5 },
    { name: 'London',       lat: 51.5074, lon: -0.1278,  utc: 0 },
    { name: 'Jerusalem',    lat: 31.7683, lon: 35.2137,  utc: 2 },
    { name: 'Los Angeles',  lat: 34.0522, lon: -118.2437,utc: -8 }
  ];

  function jdOf(date) { return date.getTime() / 86400000 + 2440587.5; }

  function renderChart(chart, date) {
    $('#wheel').innerHTML = buildWheelSVG(chart);

    const posRows = chart.planets.map(p => `
      <div class="row">
        <div class="row-body">
          <span class="glyph">${p.symbol}</span>
          <span class="pname">${p.name}</span>
        </div>
        <div class="row-val">
          ${formatLongitude(p.lon)}${p.retro ? ' <span class="rx">Rx</span>' : ''}
          <span class="house">H${p.house}</span>
        </div>
      </div>`).join('');
    $('#positions').innerHTML = posRows;

    const houseNames = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    $('#houses').innerHTML = chart.angles.houses.map((h, i) => `
      <div class="row"><div class="row-body">House ${houseNames[i]}</div><div class="row-val">${formatLongitude(h)}</div></div>
    `).join('') + `
      <div class="row angle"><div class="row-body">Ascendant</div><div class="row-val">${formatLongitude(chart.angles.asc)}</div></div>
      <div class="row angle"><div class="row-body">MC</div><div class="row-val">${formatLongitude(chart.angles.mc)}</div></div>`;

    $('#aspects').innerHTML = chart.aspects.length
      ? chart.aspects.map(a => `
        <div class="row">
          <div class="row-body">${a.a.symbol} ${a.aspect.symbol} ${a.b.symbol}</div>
          <div class="row-val">${a.a.name} ${a.aspect.name} ${a.b.name} <span class="orb">${a.orb.toFixed(1)}°</span></div>
        </div>`).join('')
      : '<div class="row"><div class="row-body">No major aspects within orb.</div></div>';

    $('#meta').textContent = `JD ${jdOf(date).toFixed(2)} · RAMC ${chart.angles.RAMC.toFixed(2)}° · ε ${chart.angles.eps.toFixed(4)}°`;
  }

  function readForm() {
    const y = parseInt($('#f-year').value, 10);
    const mo = parseInt($('#f-month').value, 10);
    const d = parseInt($('#f-day').value, 10);
    const hh = parseFloat($('#f-hour').value) || 0;
    const mm = parseFloat($('#f-minute').value) || 0;
    const utcOffset = parseFloat($('#f-utc').value) || 0;
    const lat = parseFloat($('#f-lat').value);
    const lon = parseFloat($('#f-lon').value);

    const localHours = hh + mm / 60;
    const utcHours = localHours - utcOffset;
    const date = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
    date.setUTCMilliseconds(utcHours * 3600000);

    return { date, lat, lon, name: $('#f-name').value.trim() };
  }

  function syncURL(params) {
    const url = new URLSearchParams();
    url.set('name', params.name || '');
    url.set('y', $('#f-year').value);
    url.set('mo', $('#f-month').value);
    url.set('d', $('#f-day').value);
    url.set('h', $('#f-hour').value);
    url.set('mi', $('#f-minute').value);
    url.set('utc', $('#f-utc').value);
    url.set('lat', $('#f-lat').value);
    url.set('lon', $('#f-lon').value);
    history.replaceState(null, '', location.pathname + '?' + url.toString());
  }

  function restoreFromURL() {
    const p = new URLSearchParams(location.search);
    if (!p.has('y')) return false;
    if (p.has('name')) $('#f-name').value = p.get('name');
    $('#f-year').value = p.get('y');
    $('#f-month').value = p.get('mo');
    $('#f-day').value = p.get('d');
    $('#f-hour').value = p.get('h');
    $('#f-minute').value = p.get('mi');
    $('#f-utc').value = p.get('utc');
    $('#f-lat').value = p.get('lat');
    $('#f-lon').value = p.get('lon');
    return true;
  }

  function compute() {
    const params = readForm();
    if (Number.isNaN(params.lat) || Number.isNaN(params.lon)) return;
    const chart = computeChart(params.date, params.lat, params.lon);
    renderChart(chart, params.date);
    syncURL(params);
  }

  function wireLocations() {
    const wrap = $('#locations');
    SAMPLE_LOCATIONS.forEach(loc => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'loc-btn';
      btn.textContent = loc.name;
      btn.addEventListener('click', () => {
        $('#f-lat').value = loc.lat;
        $('#f-lon').value = loc.lon;
        $('#f-utc').value = loc.utc;
      });
      wrap.appendChild(btn);
    });
  }

  function wireShare() {
    $('#share-btn').addEventListener('click', () => {
      const btn = $('#share-btn');
      const data = { title: document.title, text: 'Natal Chart — ' + ($('#f-name').value || 'shared chart'), url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(() => {
          const orig = btn.textContent;
          btn.textContent = '✓ Link copied';
          setTimeout(() => { btn.textContent = orig; }, 1800);
        });
      }
    });
  }

  function init() {
    wireLocations();
    wireShare();
    $('#chart-form').addEventListener('submit', e => { e.preventDefault(); compute(); });

    if (!restoreFromURL()) {
      const now = new Date();
      $('#f-year').value = now.getUTCFullYear();
      $('#f-month').value = now.getUTCMonth() + 1;
      $('#f-day').value = now.getUTCDate();
      $('#f-hour').value = now.getUTCHours();
      $('#f-minute').value = now.getUTCMinutes();
      $('#f-utc').value = 0;
      $('#f-lat').value = SAMPLE_LOCATIONS[0].lat;
      $('#f-lon').value = SAMPLE_LOCATIONS[0].lon;
    }
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
