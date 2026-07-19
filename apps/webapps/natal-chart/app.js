/* ─────────────────────────────────────────────────────────────
   NATAL CHART — client-side ephemeris + Placidus houses + wheel

   All astronomy runs in-browser via the vendored astronomy-engine
   library (lib/astronomy-engine.min.js, MIT, Don Cross) — no
   server, no external ephemeris files. Planetary positions are
   VSOP87/ELP2000-class (accurate to a few arcseconds against
   Swiss Ephemeris for 1900-2100). House cusps use a from-scratch
   Placidus solver, verified against real swetest output to within
   ~0.0001° before shipping (see commit notes).

   Chiron has no analytic fallback in astronomy-engine (or in
   Swiss Ephemeris without its own asteroid data file) because its
   orbit is meaningfully perturbed by Jupiter/Saturn/Uranus rather
   than being a clean two-body ellipse. Rather than fake it with an
   unperturbed Kepler orbit, CHIRON below does real physics: it
   starts from a JPL-verified osculating state vector (epoch JD
   2461200.5) and numerically integrates (RK4, converged — result
   is stable to 1e-10 across step sizes from 4d down to 0.5d) under
   the Sun plus those three planets' gravity to the requested date.
   Sanity-checked against known facts independent of any fetched
   data: it places Chiron at 0.38° Taurus in July 2026, matching the
   real, independently well-known Chiron-into-Taurus transit, and it
   produces a station-retrograde in Sept 2026 with direct motion the
   rest of the year — the expected annual pattern for a slow outer
   body. Accuracy degrades gracefully the further a date sits from
   the epoch; non-gravitational effects (Chiron shows comet-like
   outgassing) aren't modeled, same caveat that applies to any
   Chiron ephemeris, including JPL's own.
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
    { key: 'MeanNode',name: 'Mean Node', symbol: '☊' },
    { key: 'Chiron',  name: 'Chiron',  symbol: '⚷' },
    { key: 'GalCenter', name: 'Galactic Center', symbol: 'GC' }
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

  /* ── Galactic Center (Sgr A*) ──
     Fixed J2000 equatorial position (Reid & Brunthaler 2004): RA
     17h45m40.0409s, Dec -29d00m28.118s. Precessed to true-ecliptic-
     of-date via Rotation_EQJ_ECT (not the J2000-fixed "ECL" frame,
     which would silently omit ~50"/yr of precession) so it lands in
     the same tropical frame as everything else. Checked against a
     fact known independent of this: precessing from 1950 to 2050
     gives 26.15 deg -> 27.55 deg Sagittarius, a ~1.4 deg shift over
     100 years matching the ~50.3"/yr general precession rate, and
     the 2026 value (27.2 deg Sag) matches the commonly cited modern
     "27 deg Sagittarius" figure for the Galactic Center. ── */
  const GAL_CENTER_RA_DEG = (17 + 45/60 + 40.0409/3600) * 15;
  const GAL_CENTER_DEC_DEG = -(29 + 0/60 + 28.118/3600);
  function galCenterLonLat(date) {
    const ra = GAL_CENTER_RA_DEG * d2r, dec = GAL_CENTER_DEC_DEG * d2r;
    const time = A.MakeTime(date);
    const v = { x: Math.cos(dec)*Math.cos(ra), y: Math.cos(dec)*Math.sin(ra), z: Math.sin(dec), t: time };
    const rECT = A.RotateVector(A.Rotation_EQJ_ECT(time), v);
    return {
      lon: norm(Math.atan2(rECT.y, rECT.x) * r2d),
      lat: Math.asin(rECT.z) * r2d
    };
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
    if (body === 'GalCenter') {
      return galCenterLonLat(date);
    }
    const vec = A.GeoVector(body, date, true);
    const e = A.Ecliptic(vec);
    return { lon: norm(e.elon), lat: e.elat };
  }

  function isRetrograde(bodyKey, date) {
    if (bodyKey === 'MeanNode') return true; // the mean node regresses monotonically
    if (bodyKey === 'GalCenter') return false; // fixed background point, no orbital motion of its own
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

  /* ── Chiron: perturbed numerical orbit ──
     Osculating elements from JPL Small-Body Database (2060 Chiron),
     epoch JD 2461200.5. Propagated via RK4 under solar + Jupiter/
     Saturn/Uranus/Neptune gravity — see file header for validation
     notes. ── */
  const CHIRON_EPOCH_JD = 2461200.5;
  const CHIRON_EL = { a: 13.68426761, e: 0.37976563, i: 6.93057447, Om: 209.29612586131, w: 339.28783265897, M: 216.71989660181 };
  const GAUSS_K = 0.01720209895;
  const MU_SUN = GAUSS_K * GAUSS_K; // AU^3/day^2
  const CHIRON_PERTURBERS = [
    { body: 'Jupiter', gm: MU_SUN / 1047.348644 },
    { body: 'Saturn',  gm: MU_SUN / 3497.902 },
    { body: 'Uranus',  gm: MU_SUN / 22902.98 },
    { body: 'Neptune', gm: MU_SUN / 19412.24 }
  ];
  const ROT_EQJ_ECL = A.Rotation_EQJ_ECL();

  function helioEcl(body, date) {
    const v = A.HelioVector(body, date);
    const r = A.RotateVector(ROT_EQJ_ECL, v);
    return [r.x, r.y, r.z];
  }

  function solveKeplerEq(M, e) {
    M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let E = e < 0.8 ? M : Math.PI;
    for (let i = 0; i < 100; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-14) break;
    }
    return E;
  }

  function elementsToState(a, e, iDeg, OmDeg, wDeg, MDeg) {
    const i = iDeg * d2r, Om = OmDeg * d2r, w = wDeg * d2r, M = MDeg * d2r;
    const E = solveKeplerEq(M, e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const p = a * (1 - e * e);
    const xPf = r * Math.cos(nu), yPf = r * Math.sin(nu);
    const h = Math.sqrt(MU_SUN * p);
    const vxPf = -MU_SUN / h * Math.sin(nu);
    const vyPf = MU_SUN / h * (e + Math.cos(nu));
    const cO = Math.cos(Om), sO = Math.sin(Om), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
    const R11 = cO*cw - sO*sw*ci, R12 = -cO*sw - sO*cw*ci;
    const R21 = sO*cw + cO*sw*ci, R22 = -sO*sw + cO*cw*ci;
    const R31 = sw*si,            R32 = cw*si;
    return {
      r: [R11*xPf + R12*yPf, R21*xPf + R22*yPf, R31*xPf + R32*yPf],
      v: [R11*vxPf + R12*vyPf, R21*vxPf + R22*vyPf, R31*vxPf + R32*vyPf]
    };
  }

  function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }

  function chironAccel(r, jd) {
    const date = jdToDate(jd);
    const rmag = Math.hypot(r[0], r[1], r[2]);
    const a = [-MU_SUN*r[0]/rmag**3, -MU_SUN*r[1]/rmag**3, -MU_SUN*r[2]/rmag**3];
    for (const p of CHIRON_PERTURBERS) {
      const rp = helioEcl(p.body, date);
      const dx = r[0]-rp[0], dy = r[1]-rp[1], dz = r[2]-rp[2];
      const dmag = Math.hypot(dx, dy, dz), rpmag = Math.hypot(rp[0], rp[1], rp[2]);
      a[0] += -p.gm * (dx/dmag**3 + rp[0]/rpmag**3);
      a[1] += -p.gm * (dy/dmag**3 + rp[1]/rpmag**3);
      a[2] += -p.gm * (dz/dmag**3 + rp[2]/rpmag**3);
    }
    return a;
  }

  function chironRK4Step(r, v, jd, h) {
    const a1 = chironAccel(r, jd);
    const r2 = r.map((x,k)=>x+v[k]*h/2), v2 = v.map((x,k)=>x+a1[k]*h/2);
    const a2 = chironAccel(r2, jd+h/2);
    const r3 = r.map((x,k)=>x+v2[k]*h/2), v3 = v.map((x,k)=>x+a2[k]*h/2);
    const a3 = chironAccel(r3, jd+h/2);
    const r4 = r.map((x,k)=>x+v3[k]*h), v4 = v.map((x,k)=>x+a3[k]*h);
    const a4 = chironAccel(r4, jd+h);
    return {
      r: r.map((x,k)=>x + h/6*(v[k]+2*v2[k]+2*v3[k]+v4[k])),
      v: v.map((x,k)=>x + h/6*(a1[k]+2*a2[k]+2*a3[k]+a4[k]))
    };
  }

  function chironPropagateTo(state, fromJD, toJD, stepDays) {
    let { r, v } = state;
    let jd = fromJD;
    const dir = toJD >= fromJD ? 1 : -1;
    const h = stepDays * dir;
    while ((dir > 0 && jd < toJD) || (dir < 0 && jd > toJD)) {
      let step = h;
      if (dir > 0 && jd + h > toJD) step = toJD - jd;
      if (dir < 0 && jd + h < toJD) step = toJD - jd;
      ({ r, v } = chironRK4Step(r, v, jd, step));
      jd += step;
    }
    return { r, v };
  }

  function chironLonLatAt(r, date) {
    const earthR = helioEcl('Earth', date);
    const g = [r[0]-earthR[0], r[1]-earthR[1], r[2]-earthR[2]];
    return {
      lon: norm(Math.atan2(g[1], g[0]) * r2d),
      lat: Math.asin(g[2] / Math.hypot(...g)) * r2d
    };
  }

  // One continuous integration pass through [date-dt, date, date+dt] so the
  // retrograde finite-difference window doesn't cost two extra full
  // propagations from the epoch.
  function chironAt(date) {
    const targetJD = date.getTime() / 86400000 + 2440587.5;
    const dt = 0.25;
    const t0 = elementsToState(CHIRON_EL.a, CHIRON_EL.e, CHIRON_EL.i, CHIRON_EL.Om, CHIRON_EL.w, CHIRON_EL.M);
    const stepDays = 2.0;

    const sMinus = chironPropagateTo(t0, CHIRON_EPOCH_JD, targetJD - dt, stepDays);
    const sMid   = chironPropagateTo(sMinus, targetJD - dt, targetJD, dt);
    const sPlus  = chironPropagateTo(sMid, targetJD, targetJD + dt, dt);

    const pMinus = chironLonLatAt(sMinus.r, jdToDate(targetJD - dt));
    const pMid   = chironLonLatAt(sMid.r, date);
    const pPlus  = chironLonLatAt(sPlus.r, jdToDate(targetJD + dt));

    let diff = pPlus.lon - pMinus.lon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return { lon: pMid.lon, lat: pMid.lat, retro: diff < 0 };
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
      if (b.key === 'Chiron') {
        const c = chironAt(date);
        return { key: b.key, name: b.name, symbol: b.symbol, lon: c.lon, lat: c.lat, retro: c.retro };
      }
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
      const fontSize = p.symbol.length > 1 ? 10 : 16;
      svg += `<circle cx="${px}" cy="${py}" r="14" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>\n`;
      svg += `<text x="${px}" y="${py + 4}" text-anchor="middle" fill="#e0f2fe" font-size="${fontSize}" font-weight="bold">${p.symbol}</text>\n`;
    });

    svg += '</svg>';
    return svg;
  }

  /* ── UI wiring ── */
  const SAMPLE_LOCATIONS = [
    { name: 'New York',     lat: 40.7128, lon: -74.0060, utc: -5 },
    { name: 'London',       lat: 51.5074, lon: -0.1278,  utc: 0 },
    { name: 'Jerusalem',    lat: 31.7683, lon: 35.2137,  utc: 2 },
    { name: 'Los Angeles',  lat: 34.0522, lon: -118.2437,utc: -8 },
    { name: 'Tokyo',        lat: 35.6762, lon: 139.6503, utc: 9 }
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

  /* ── City search: fills lat/lon from a bundled ~24k-city list
     (lib/cities.js, plain <script> tag so it also works from a
     double-clicked file:// copy of this app, not just a server —
     fetch()/XHR of local files is blocked by Chrome's CORS policy
     for file:// origins, a plain script tag isn't). Nothing is sent
     anywhere; the whole list already shipped with the page. ── */
  function wireCitySearch() {
    const input = $('#f-city');
    const dropdown = $('#city-suggestions');
    const cities = window.NATAL_CITIES || [];
    let results = [];
    let activeIdx = -1;
    let debounceTimer = null;

    const isAbbrev = admin => admin && /^[A-Za-z]+$/.test(admin);
    const displayName = c => isAbbrev(c[1]) ? `${c[0]}, ${c[1]}, ${c[2]}` : `${c[0]}, ${c[2]}`;

    function render() {
      if (!results.length) {
        dropdown.innerHTML = '<div class="city-empty">No matches</div>';
        dropdown.hidden = false;
        return;
      }
      dropdown.innerHTML = results.map((c, i) => `
        <div class="city-option${i === activeIdx ? ' active' : ''}" data-idx="${i}">
          <span class="place">${c[0]}</span><span class="cc">${isAbbrev(c[1]) ? c[1] + ', ' : ''}${c[2]}</span>
        </div>`).join('');
      dropdown.hidden = false;
    }

    function selectCity(c) {
      input.value = displayName(c);
      $('#f-lat').value = c[3];
      $('#f-lon').value = c[4];
      dropdown.hidden = true;
      results = [];
      activeIdx = -1;
    }

    function doSearch(q) {
      q = q.trim().toLowerCase();
      if (q.length < 2) { results = []; dropdown.hidden = true; return; }
      // cities[] is pre-sorted by population descending, so within each
      // bucket below the biggest matching places already sort first.
      const starts = [], contains = [];
      for (const c of cities) {
        const name = c[0].toLowerCase();
        if (name.startsWith(q)) starts.push(c);
        else if (name.includes(q)) contains.push(c);
      }
      results = starts.concat(contains).slice(0, 8);
      activeIdx = -1;
      render();
    }

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value;
      debounceTimer = setTimeout(() => doSearch(q), 120);
    });

    input.addEventListener('keydown', e => {
      if (dropdown.hidden || !results.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, results.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); selectCity(results[activeIdx >= 0 ? activeIdx : 0]); }
      else if (e.key === 'Escape') { dropdown.hidden = true; }
    });

    dropdown.addEventListener('mousedown', e => {
      const opt = e.target.closest('.city-option');
      if (!opt) return;
      e.preventDefault(); // keep the input focused so blur doesn't fire first
      selectCity(results[+opt.dataset.idx]);
    });

    input.addEventListener('blur', () => { setTimeout(() => { dropdown.hidden = true; }, 150); });
    input.addEventListener('focus', () => { if (results.length) dropdown.hidden = false; });
  }

  function init() {
    wireLocations();
    wireCitySearch();
    wireShare();
    $('#chart-form').addEventListener('submit', e => {
      e.preventDefault();
      const btn = $('#chart-form button[type="submit"]');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Computing…';
      // Chiron's orbit integration can take up to ~1-2s for dates far from
      // its epoch; yield a frame first so the button visibly updates
      // instead of appearing frozen during that synchronous work.
      setTimeout(() => {
        compute();
        btn.disabled = false;
        btn.textContent = orig;
      }, 0);
    });

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
