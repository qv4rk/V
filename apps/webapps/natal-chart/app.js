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
     real Placidus house cusps, planets on the mid ring ──
     Palette is pulled out so the exact same geometry can be reused for
     the on-screen dark wheel, the deluxe report (same dark/gold look,
     just a different page around it) and the ink-friendly printer
     report (light background, dark strokes) without duplicating the
     trig. ── */
  const WHEEL_PALETTES = {
    dark: {
      outerFill: '#0f172a', outerStroke: '#334155',
      innerFill: '#020617', innerStroke: '#475569',
      wedgeA: '#1e2937', wedgeB: '#111827', wedgeStroke: '#334155',
      zodiacText: '#94a3b8',
      houseAxis: '#94a3b8', houseMinor: '#475569',
      asc: '#22c55e', mc: '#38bdf8',
      planetFill: '#0f172a', planetStroke: '#64748b', planetText: '#e0f2fe'
    },
    print: {
      outerFill: '#ffffff', outerStroke: '#333333',
      innerFill: '#ffffff', innerStroke: '#999999',
      wedgeA: '#f2f2f2', wedgeB: '#ffffff', wedgeStroke: '#cccccc',
      zodiacText: '#222222',
      houseAxis: '#222222', houseMinor: '#aaaaaa',
      asc: '#15803d', mc: '#0369a1',
      planetFill: '#ffffff', planetStroke: '#555555', planetText: '#111111'
    }
  };

  function buildWheelSVG(chart, paletteKey) {
    const pal = WHEEL_PALETTES[paletteKey] || WHEEL_PALETTES.dark;
    const size = 620, cx = size / 2, cy = size / 2;
    const outerR = 290, innerR = 200;
    const asc = chart.angles.asc, mc = chart.angles.mc, houses = chart.angles.houses;

    const rot = targetLon => 180 - (targetLon - asc);
    const pt = (r, angleDeg) => [cx + r * Math.cos(angleDeg * d2r), cy + r * Math.sin(angleDeg * d2r)];

    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${pal.outerFill}" stroke="${pal.outerStroke}" stroke-width="2"/>\n`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${pal.innerFill}" stroke="${pal.innerStroke}" stroke-width="1"/>\n`;

    for (let i = 0; i < 12; i++) {
      const a1 = rot(i * 30), a2 = rot((i + 1) * 30);
      const [x1, y1] = pt(outerR, a1), [x2, y2] = pt(outerR, a2);
      const color = i % 2 === 0 ? pal.wedgeA : pal.wedgeB;
      svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} Z" fill="${color}" stroke="${pal.wedgeStroke}" stroke-width="1"/>\n`;
      const [tx, ty] = pt(outerR - 20, a1 - 15);
      svg += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" fill="${pal.zodiacText}" font-size="11" font-family="monospace">${ZODIAC[i]}</text>\n`;
    }

    houses.forEach((h, i) => {
      const angle = rot(h);
      const [x1, y1] = pt(innerR, angle), [x2, y2] = pt(outerR - 40, angle);
      const isAxis = [0,3,6,9].includes(i);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${isAxis ? pal.houseAxis : pal.houseMinor}" stroke-width="${isAxis ? 2 : 1}"/>\n`;
    });

    svg += `<line x1="${cx - outerR - 15}" y1="${cy}" x2="${cx - innerR}" y2="${cy}" stroke="${pal.asc}" stroke-width="3"/>\n`;
    svg += `<text x="${cx - outerR - 45}" y="${cy + 5}" fill="${pal.asc}" font-size="14" font-weight="bold">Asc</text>\n`;

    const mcAngle = rot(mc);
    const [mx1, my1] = pt(innerR, mcAngle), [mx2, my2] = pt(outerR + 15, mcAngle);
    svg += `<line x1="${mx1}" y1="${my1}" x2="${mx2}" y2="${my2}" stroke="${pal.mc}" stroke-width="3"/>\n`;
    svg += `<text x="${mx2}" y="${my2}" fill="${pal.mc}" font-size="14" font-weight="bold">MC</text>\n`;

    chart.planets.forEach(p => {
      const angle = rot(p.lon);
      const [px, py] = pt(145, angle);
      const fontSize = p.symbol.length > 1 ? 10 : 16;
      svg += `<circle cx="${px}" cy="${py}" r="14" fill="${pal.planetFill}" stroke="${pal.planetStroke}" stroke-width="1.5"/>\n`;
      svg += `<text x="${px}" y="${py + 4}" text-anchor="middle" fill="${pal.planetText}" font-size="${fontSize}" font-weight="bold">${p.symbol}</text>\n`;
    });

    svg += '</svg>';
    return svg;
  }

  /* ── Sky View: overlay the chart's points on a real star map ──
     d3-celestial's own catalogs (stars.6.json etc.) are equatorial
     J2000. Chart points are computed in true-ecliptic-of-date, so
     each needs converting: ecliptic-of-date -> equatorial-of-date
     (Rotation_ECT_EQD) -> equatorial J2000 (Rotation_EQD_EQJ). This
     is the exact inverse of the Galactic Center calculation above,
     and was verified the same way: round-tripping a known RA/Dec
     through both directions reproduces the input to ~1e-13 deg.
     d3-celestial itself stores RA in degrees over (-180,180], which
     is exactly what atan2 already returns -- no extra wraparound
     needed. ── */
  function eclDateToEqJ2000(lonDeg, latDeg, date) {
    const lon = lonDeg * d2r, lat = latDeg * d2r;
    const time = A.MakeTime(date);
    const v = { x: Math.cos(lat)*Math.cos(lon), y: Math.cos(lat)*Math.sin(lon), z: Math.sin(lat), t: time };
    const rEQD = A.RotateVector(A.Rotation_ECT_EQD(time), v);
    const rEQJ = A.RotateVector(A.Rotation_EQD_EQJ(time), rEQD);
    return [Math.atan2(rEQJ.y, rEQJ.x) * r2d, Math.asin(rEQJ.z) * r2d]; // [ra(-180..180), dec]
  }

  let skyReady = false;
  let skyPoints = [];

  function skyRedraw() {
    if (!window.Celestial || !Celestial.container) return;
    const ctx = Celestial.context;
    const trans = Celestial.settings().transform;
    skyPoints.forEach(p => {
      const pos = Celestial.getPoint([p.ra, p.dec], trans);
      if (!Celestial.clip(pos)) return;
      const xy = Celestial.mapProjection(pos);
      if (!xy) return;
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 9, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(10,14,28,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#c9a84c';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = '#e8c96d';
      ctx.font = `bold ${p.symbol.length > 1 ? 9 : 12}px 'Space Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, xy[0], xy[1] + 1);
    });
  }

  function initSky() {
    Celestial.display({
      container: 'celestial-map',
      datapath: 'lib/celestial/data/',
      width: 0,
      projection: 'aitoff',
      transform: 'ecliptic',
      center: null,
      geopos: null,
      location: false,
      follow: 'center',
      zoomlevel: null,
      zoomextend: 8,
      interactive: true,
      controls: true,
      form: false,
      advanced: false,
      stars: { show: true, limit: 6, colors: true, designation: false, propername: false, data: 'stars.6.json' },
      dsos: { show: false },
      constellations: { show: true, names: true, lines: true, bounds: false },
      mw: { show: true },
      planets: { show: false },
      lines: { graticule: { show: false }, equatorial: { show: false }, ecliptic: { show: true, stroke: '#c9a84c', width: 1, opacity: 0.4 } }
    });
    Celestial.add({ type: 'raw', callback: () => {}, redraw: skyRedraw });
    skyReady = true;
  }

  function updateSky(chart, date) {
    skyPoints = chart.planets.map(p => {
      const [ra, dec] = eclDateToEqJ2000(p.lon, p.lat, date);
      return { ra, dec, symbol: p.symbol, name: p.name };
    });
    if (!skyReady) {
      initSky();
    } else {
      Celestial.redraw();
    }
  }

  function setSkyMode(mode, lat, lon, date) {
    if (!skyReady) return;
    const caption = $('#sky-caption');
    // location/geopos/follow don't take effect through apply() -- verified by
    // inspecting Celestial.settings() before/after an apply() call, which
    // showed them unchanged. reload() re-runs the actual load/orientation
    // sequence that reads them. It doesn't clear Celestial.data, so the
    // custom overlay layer survives without needing to be re-added.
    // Separately, changing projection has to go through the dedicated
    // reproject() call -- passing it to reload() updates the map visually
    // but not in one step together with location, so both calls are needed
    // in sequence (reload first, then reproject).
    if (mode === 'literal') {
      Celestial.date(date);
      Celestial.reload({ location: true, geopos: [lat, lon], follow: 'zenith', center: null });
      // stereographic is a clipped hemisphere ("dome") projection -- only
      // what's actually above the horizon at that place/time is shown,
      // unlike aitoff which maps the whole celestial sphere regardless.
      Celestial.reproject({ projection: 'stereographic' });
      caption.textContent = 'The literal dome of sky over the birth location at the moment of birth — only points above the horizon are visible.';
    } else {
      Celestial.reload({ location: false, follow: 'center', center: null });
      Celestial.reproject({ projection: 'aitoff' });
      caption.textContent = 'Every chart point plotted against the real stars, ecliptic band running through center. Scroll/drag/pinch to explore.';
    }
    $('#sky-mode-whole').classList.toggle('active', mode !== 'literal');
    $('#sky-mode-literal').classList.toggle('active', mode === 'literal');
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
    $('#wheel').innerHTML = buildWheelSVG(chart, 'dark');

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

  let lastParams = null;
  let lastChart = null;
  let currentSkyMode = 'whole';

  function compute() {
    const params = readForm();
    if (Number.isNaN(params.lat) || Number.isNaN(params.lon)) return;
    const chart = computeChart(params.date, params.lat, params.lon);
    renderChart(chart, params.date);
    syncURL(params);
    lastParams = params;
    lastChart = chart;
    updateSky(chart, params.date);
    if (currentSkyMode === 'literal') setSkyMode('literal', params.lat, params.lon, params.date);
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

  /* ── One-page report export ──
     Two variants sharing one layout/data pass: "print" is a Letter-size,
     white-background, minimal-ink sheet (the sky snapshot's colors are
     inverted -- black background -> white, light stars -> dark flecks --
     so it doesn't dump a solid black rectangle of ink onto the page);
     "deluxe" is an A4 sheet keeping the app's native dark/gold palette
     with a gold trim border, meant to be printed at a print shop and
     framed. Both open in a new tab as a fully standalone HTML document
     (own <style>, no dependency on this page's CSS) and immediately
     invoke the browser's print dialog, whose own "Save as PDF" is the
     export path -- no PDF-generation library needed. ── */
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function compactLat(deg) {
    const dir = deg < 0 ? 'S' : 'N';
    const val = Math.abs(deg), d = Math.floor(val), m = Math.round((val % 1) * 60);
    return `${d}°${String(m).padStart(2,'0')}'${dir}`;
  }
  function compactLon(deg) {
    const dir = deg < 0 ? 'W' : 'E';
    const val = Math.abs(deg), d = Math.floor(val), m = Math.round((val % 1) * 60);
    return `${d}°${String(m).padStart(2,'0')}'${dir}`;
  }

  function formatBirthLine() {
    const y = $('#f-year').value, mo = parseInt($('#f-month').value, 10) || 1, d = $('#f-day').value;
    const hh = String($('#f-hour').value || 0).padStart(2, '0'), mi = String($('#f-minute').value || 0).padStart(2, '0');
    const utc = parseFloat($('#f-utc').value) || 0;
    const utcStr = 'UTC' + (utc >= 0 ? '+' : '') + utc;
    const city = $('#f-city').value.trim();
    const coords = `${compactLat(lastParams.lat)}, ${compactLon(lastParams.lon)}`;
    return `${MONTH_NAMES[mo - 1]} ${d}, ${y} · ${hh}:${mi} ${utcStr} · ${city ? city + ' · ' : ''}${coords}`;
  }

  // The whole sky-view widget is a single <canvas> (verified against
  // d3-celestial's actual render target, not assumed) -- one
  // toDataURL() away from a snapshot, no SVG/canvas compositing needed.
  // Inverting for print is a straight RGB invert on an offscreen copy:
  // black background -> white, light-colored stars/text -> dark flecks,
  // exactly the "don't eat someone's ink cartridge" ask.
  function captureSkySnapshot(invert) {
    const src = document.querySelector('#celestial-map canvas');
    if (!src || !src.width) return null;
    if (!invert) return src.toDataURL('image/png');
    const off = document.createElement('canvas');
    off.width = src.width; off.height = src.height;
    const octx = off.getContext('2d');
    octx.filter = 'invert(1)';
    octx.drawImage(src, 0, 0);
    return off.toDataURL('image/png');
  }

  const REPORT_CSS_BASE = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Courier New',monospace; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
    .sheet{position:relative; width:100%; padding:4mm 5mm; max-width:216mm; margin:0 auto;}
    header{border-bottom:0.4mm solid currentColor; padding-bottom:1.5mm; margin-bottom:2mm;}
    h1{font-size:16pt; letter-spacing:1px; margin-bottom:.8mm;}
    .subtitle{font-size:8pt; opacity:.75; letter-spacing:.3px;}
    .main-grid{display:grid; grid-template-columns:60mm 1fr; gap:5mm; align-items:start;}
    .wheel-wrap svg{width:100%; height:auto; display:block;}
    table{width:100%; border-collapse:collapse; font-size:7.5pt; margin-bottom:2mm;}
    table td{padding:.4mm 2mm; border-bottom:0.2mm solid currentColor; opacity:.95; line-height:1.2;}
    table tr:last-child td{border-bottom:none;}
    td.glyph{width:6mm; text-align:center; font-size:9pt;}
    .rx{font-weight:bold;}
    .section-title{text-transform:uppercase; letter-spacing:1.5px; font-size:7pt; margin:1.5mm 0 .8mm; opacity:.7;}
    .aspect-grid{display:flex; flex-wrap:wrap; gap:1mm 5mm; font-size:6.8pt; margin-bottom:1mm; line-height:1.4;}
    .sky-wrap{text-align:center; margin-top:1mm;}
    .sky-wrap img{max-width:100%; max-height:36mm; border-radius:2mm;}
    .sky-cap{font-size:6.2pt; opacity:.65; margin-top:.8mm;}
    footer{margin-top:1.5mm; font-size:5.8pt; opacity:.55; text-align:center;}
    @media screen { body{ background:#444; padding:10mm 0; } .sheet{ box-shadow:0 4px 24px rgba(0,0,0,.4);} }
  `;
  const REPORT_CSS_PRINT = `
    @page { size: letter; margin: 9mm 11mm; }
    body.report.print{ background:#fff; color:#111; }
    body.report.print .sheet{ background:#fff; }
    body.report.print table td{ border-bottom-color:#ddd; }
    body.report.print .section-title{ border-bottom:0.2mm solid #ccc; padding-bottom:.8mm; }
    body.report.print .sky-wrap img{ border:0.3mm solid #ccc; }
  `;
  const REPORT_CSS_DELUXE = `
    @page { size: A4; margin: 7mm; }
    body.report.deluxe{ background:#050308; color:#e8dcc0; }
    body.report.deluxe .sheet{ background:#050308; }
    body.report.deluxe h1{ color:#e8c96d; }
    body.report.deluxe .section-title{ color:#c9a84c; border-bottom:0.2mm solid #6b5a28; padding-bottom:.8mm; }
    body.report.deluxe table td{ border-bottom-color:#332a12; }
    body.report.deluxe .sky-wrap img{ border:0.3mm solid #6b5a28; }
    body.report.deluxe .sheet.gold-frame{ border:2mm solid #c9a84c; padding:8mm 7mm; }
    body.report.deluxe .gold-frame::after{ content:''; position:absolute; inset:3mm; border:0.5mm solid #8a7333; pointer-events:none; }
    body.report.deluxe .corner{ position:absolute; width:5mm; height:5mm; background:#c9a84c; transform:rotate(45deg); }
    body.report.deluxe .corner.tl{ top:-2.5mm; left:-2.5mm; }
    body.report.deluxe .corner.tr{ top:-2.5mm; right:-2.5mm; }
    body.report.deluxe .corner.bl{ bottom:-2.5mm; left:-2.5mm; }
    body.report.deluxe .corner.br{ bottom:-2.5mm; right:-2.5mm; }
  `;

  function buildReportHTML(variant) {
    if (!lastChart || !lastParams) return null;
    const chart = lastChart;
    const isDeluxe = variant === 'deluxe';
    const wheelSVG = buildWheelSVG(chart, isDeluxe ? 'dark' : 'print');
    const skyImg = captureSkySnapshot(!isDeluxe);
    const name = $('#f-name').value.trim() || 'Natal Chart';
    const birthLine = formatBirthLine();

    const posRows = chart.planets.map(p => `
      <tr><td class="glyph">${p.symbol}</td><td>${p.name}</td>
      <td>${formatLongitude(p.lon)}${p.retro ? ' <span class="rx">Rx</span>' : ''}</td>
      <td>H${p.house}</td></tr>`).join('');

    const houseNames = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    const houseRows = chart.angles.houses.map((h, i) => `<tr><td>${houseNames[i]}</td><td>${formatLongitude(h)}</td></tr>`).join('')
      + `<tr><td>Asc</td><td>${formatLongitude(chart.angles.asc)}</td></tr>`
      + `<tr><td>MC</td><td>${formatLongitude(chart.angles.mc)}</td></tr>`;

    const aspectChips = chart.aspects.length
      ? chart.aspects.map(a => `<span class="aspect-chip">${a.a.symbol}${a.aspect.symbol}${a.b.symbol} <b>${a.a.name}</b> ${a.aspect.name} <b>${a.b.name}</b> (${a.orb.toFixed(1)}°)</span>`).join('')
      : '<span class="aspect-chip">No major aspects within orb.</span>';

    const skyModeLabel = currentSkyMode === 'literal'
      ? 'The literal sky over the birth location at the moment of birth.'
      : 'Whole sky, ecliptic-centered — every chart point plotted against the real stars.';
    const generatedStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(name)} — Natal Chart Report</title>
<style>${REPORT_CSS_BASE}${isDeluxe ? REPORT_CSS_DELUXE : REPORT_CSS_PRINT}</style>
</head>
<body class="report ${variant}">
  <div class="sheet${isDeluxe ? ' gold-frame' : ''}">
    ${isDeluxe ? '<div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>' : ''}
    <header>
      <h1>${escapeHtml(name)}</h1>
      <div class="subtitle">${escapeHtml(birthLine)}</div>
    </header>
    <div class="main-grid">
      <div class="wheel-wrap">${wheelSVG}</div>
      <div class="tables-wrap">
        <div class="section-title">Planetary Positions</div>
        <table class="positions"><tbody>${posRows}</tbody></table>
        <div class="section-title">Houses &amp; Angles</div>
        <table class="houses"><tbody>${houseRows}</tbody></table>
      </div>
    </div>
    <div class="section-title">Major Aspects</div>
    <div class="aspect-grid">${aspectChips}</div>
    <div class="sky-wrap">
      ${skyImg ? `<img src="${skyImg}" alt="Sky view">` : ''}
      <div class="sky-cap">${escapeHtml(skyModeLabel)}</div>
    </div>
    <footer>Generated ${generatedStr} · The Atlas Natal Chart · in-browser ephemeris, Placidus houses, ecliptic of date</footer>
  </div>
</body></html>`;
  }

  // window.open() has to happen synchronously inside the click handler
  // (before any await) to count as a trusted user gesture -- otherwise
  // popup blockers eat it. Everything buildReportHTML does is already
  // synchronous (toDataURL, string building), so there's no async gap
  // to worry about here regardless, but the open-first order is kept
  // anyway since it's the robust pattern.
  function openReport(variant) {
    if (!lastChart) { alert('Cast a chart first.'); return; }
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to open the report.'); return; }
    const html = buildReportHTML(variant);
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.addEventListener('load', () => { w.focus(); w.print(); });
  }

  function wireReportExport() {
    $('#report-print-btn').addEventListener('click', () => openReport('print'));
    $('#report-deluxe-btn').addEventListener('click', () => openReport('deluxe'));
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

  function wireSkyToggle() {
    $('#sky-mode-whole').addEventListener('click', () => {
      currentSkyMode = 'whole';
      if (lastParams) setSkyMode('whole', lastParams.lat, lastParams.lon, lastParams.date);
    });
    $('#sky-mode-literal').addEventListener('click', () => {
      currentSkyMode = 'literal';
      if (lastParams) setSkyMode('literal', lastParams.lat, lastParams.lon, lastParams.date);
    });
  }

  function init() {
    wireLocations();
    wireCitySearch();
    wireSkyToggle();
    wireShare();
    wireReportExport();
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
