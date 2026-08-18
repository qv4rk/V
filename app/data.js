/* ─────────────────────────────────────────────────────────────
   THE ATLAS — Astronomical data + helpers
   Shared by every module. Keep math pure here.
   ───────────────────────────────────────────────────────────── */
window.MA = window.MA || {};

(function(MA){
  'use strict';

  /* ── Constants ── */
  MA.J2000  = 2451545.0;            // Julian Date of J2000.0 epoch
  MA.d2r    = Math.PI / 180;
  MA.r2d    = 180 / Math.PI;
  MA.TEETH_PER_YEAR = 64;            // Antikythera b1 — main solar gear

  /* ── Time conversions ── */
  MA.jd = function(d) { return d.getTime() / 86400000 + 2440587.5; };
  MA.dj = function(j) { return new Date((j - 2440587.5) * 86400000); };
  MA.julianCenturies = function(jdt) { return (jdt - MA.J2000) / 36525; };

  // Greenwich Mean Sidereal Time (deg)
  MA.calcGMST = function(jdt) {
    const d = jdt - MA.J2000;
    return ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
  };
  MA.calcLST = function(jdt, lonDeg) {
    return (MA.calcGMST(jdt) + lonDeg + 360) % 360;
  };

  /* ── Date formatting (works for BCE too) ── */
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN',
                  'JUL','AUG','SEP','OCT','NOV','DEC'];
  MA.fmtDate = function(jdt, opts) {
    opts = opts || {};
    const d = MA.dj(jdt);
    const yr = d.getUTCFullYear();
    const mo = MONTHS[d.getUTCMonth()];
    const dy = String(d.getUTCDate()).padStart(2,'0');
    const era = yr < 1 ? ` BCE` : (yr < 1000 ? ` CE` : '');
    const yrStr = Math.abs(yr < 1 ? yr - 1 : yr);
    return opts.short ? `${yrStr}${era}` : `${dy} ${mo} ${yrStr}${era}`;
  };

  // Date from y/m/d (handles negative years via UTC)
  MA.ymdToJd = function(y, m, d) {
    // For years < 1 we use UTC manually
    const dt = new Date(Date.UTC(2000, 0, 1));
    dt.setUTCFullYear(y);
    dt.setUTCMonth((m||1)-1);
    dt.setUTCDate(d||1);
    return MA.jd(dt);
  };

  /* ══════════════════════════════════════════════════════
     PLANETS — Mean orbital elements (J2000) + linear rates
     Standard ephemeris formula (JPL, low-precision).
     Returns ecliptic position in AU.
     ══════════════════════════════════════════════════════ */
  MA.PLANETS = [
    {id:'mer',name:'Mercury',symbol:'☿',color:'#b0b0b8',ring:2,
     a:0.38709927,e:0.20563593,i:7.00497902,L:252.2503235,W:77.45779628,N:48.33076593,
     da:3.7e-7,de:0.00001906,di:-0.00594749,dL:149472.67411175,dW:0.16047689,dN:-0.12534081},
    {id:'ven',name:'Venus',symbol:'♀',color:'#e8d090',ring:3,
     a:0.72333566,e:0.00677672,i:3.39467605,L:181.9790995,W:131.60246718,N:76.67984255,
     da:3.9e-6,de:-0.00004107,di:-0.0007889,dL:58517.81538729,dW:0.00268329,dN:-0.27769418},
    {id:'ter',name:'Earth',symbol:'⊕',color:'#56b4e0',ring:4,
     a:1.00000261,e:0.01671123,i:-0.00001531,L:100.46457166,W:102.93768193,N:0,
     da:0.00000562,de:-0.00004392,di:-0.01294668,dL:35999.37244981,dW:0.32327364,dN:0},
    {id:'mar',name:'Mars',symbol:'♂',color:'#e05840',ring:5,
     a:1.52371034,e:0.09339410,i:1.84969142,L:-4.55343205,W:-23.94362959,N:49.55953891,
     da:0.00001847,de:0.00007882,di:-0.00813131,dL:19140.30268499,dW:0.44441088,dN:-0.29257343},
    {id:'jup',name:'Jupiter',symbol:'♃',color:'#d4956a',ring:6,
     a:5.202887,e:0.04838624,i:1.30439695,L:34.39644051,W:14.72847983,N:100.47390909,
     da:-0.00011607,de:-0.00013253,di:-0.00183714,dL:3034.74612775,dW:0.21252668,dN:0.20469106},
    {id:'sat',name:'Saturn',symbol:'♄',color:'#e8d870',ring:7,
     a:9.53667594,e:0.05386179,i:2.48599187,L:49.95424423,W:92.59887831,N:113.66242448,
     da:-0.0012506,de:-0.00050991,di:0.00193609,dL:1222.49362201,dW:-0.41897216,dN:-0.28867794}
  ];

  // Kepler equation solver
  function kepler(M, e) {
    let E = M;
    for (let k = 0; k < 60; k++) {
      const d = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
      E += d;
      if (Math.abs(d) < 1e-12) break;
    }
    return E;
  }

  function orb2ecl(r, nu, i_d, Om_d, om_d) {
    const i = i_d * MA.d2r, Om = Om_d * MA.d2r, om = om_d * MA.d2r;
    const xo = r * Math.cos(nu), yo = r * Math.sin(nu);
    const cO = Math.cos(Om), sO = Math.sin(Om);
    const co = Math.cos(om), so = Math.sin(om);
    const ci = Math.cos(i),  si = Math.sin(i);
    return {
      x:(cO*co-sO*so*ci)*xo + (-cO*so-sO*co*ci)*yo,
      y:(sO*co+cO*so*ci)*xo + (-sO*so+cO*co*ci)*yo,
      z: si*(so*xo + co*yo)
    };
  }

  // Ecliptic heliocentric position
  MA.planetPos = function(p, jdt) {
    const T = MA.julianCenturies(jdt);
    const a = p.a + p.da*T;
    const e = p.e + p.de*T;
    const i = p.i + p.di*T;
    const L = ((p.L + p.dL*T) % 360 + 360) % 360;
    const W = p.W + p.dW*T;
    const N = p.N + p.dN*T;
    const om = ((W - N) % 360 + 360) % 360;
    const M  = ((L - W) % 360 + 360) % 360;
    const E  = kepler(M * MA.d2r, e);
    const nu = 2 * Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),
                              Math.sqrt(1-e)*Math.cos(E/2));
    const r = a * (1 - e * Math.cos(E));
    const ec = orb2ecl(r, nu, i, N, om);
    // Heliocentric ecliptic longitude in deg
    const helLon = ((Math.atan2(ec.y, ec.x) * MA.r2d) + 360) % 360;
    return { x:ec.x, y:ec.y, z:ec.z, r, lon:helLon };
  };

  // Geocentric ecliptic vector (planet pos - earth pos)
  MA.geoVec = function(p, jdt) {
    const pp = MA.planetPos(p, jdt);
    const ep = MA.planetPos(MA.PLANETS[2], jdt);
    return { x: pp.x - ep.x, y: pp.y - ep.y, z: pp.z - ep.z, dist: 0 };
  };

  // Ecliptic to equatorial
  MA.ecl2eq = function(ecl, jdt) {
    const T = MA.julianCenturies(jdt);
    const eps = (23.439291111 - 0.013004167*T) * MA.d2r;
    const {x,y,z} = ecl;
    const yeq = y*Math.cos(eps) - z*Math.sin(eps);
    const zeq = y*Math.sin(eps) + z*Math.cos(eps);
    const dist = Math.sqrt(x*x + y*y + z*z) || 1;
    return {
      ra: ((Math.atan2(yeq, x) * MA.r2d) + 360) % 360,
      dec: Math.asin(Math.max(-1, Math.min(1, zeq/dist))) * MA.r2d,
      dist
    };
  };

  // Sun geocentric apparent ecliptic longitude (deg) — for atrium pointer
  MA.sunEclLon = function(jdt) {
    const ep = MA.planetPos(MA.PLANETS[2], jdt); // earth helio
    return ((Math.atan2(-ep.y, -ep.x) * MA.r2d) + 360) % 360;
  };

  // Moon mean ecliptic longitude (Meeus low-precision)
  MA.moonEclLon = function(jdt) {
    const T = MA.julianCenturies(jdt);
    // Mean longitude
    const L = 218.3164477 + 481267.88123421*T
              - 0.0015786*T*T + T*T*T/538841 - T*T*T*T/65194000;
    // Mean anomaly
    const Mp = 134.9633964 + 477198.8675055*T + 0.0087414*T*T;
    // Mean elongation
    const D = 297.8501921 + 445267.1114034*T - 0.0018819*T*T;
    // Sun mean anomaly
    const M = 357.5291092 + 35999.0502909*T;
    // Equation of center & a few terms (deg)
    const lon = L
      + 6.289 * Math.sin(Mp*MA.d2r)
      - 1.274 * Math.sin((2*D - Mp)*MA.d2r)
      + 0.658 * Math.sin(2*D*MA.d2r)
      - 0.186 * Math.sin(M*MA.d2r)
      - 0.059 * Math.sin((2*Mp - 2*D)*MA.d2r);
    return ((lon % 360) + 360) % 360;
  };

  // Moon phase 0..1 (0=new, 0.5=full)
  MA.moonPhase = function(jdt) {
    const sunL  = MA.sunEclLon(jdt);
    const moonL = MA.moonEclLon(jdt);
    const ang = ((moonL - sunL) % 360 + 360) % 360;
    return ang / 360;
  };

  /* ══════════════════════════════════════════════════════
     ANTIKYTHERA — Cycles & gear data
     ══════════════════════════════════════════════════════ */
  MA.SYNODIC_MONTH_DAYS = 29.530588853;
  MA.SAROS_MONTHS  = 223;
  MA.METONIC_MONTHS = 235;
  MA.SAROS_DAYS    = MA.SAROS_MONTHS  * MA.SYNODIC_MONTH_DAYS;   // ~6585.32
  MA.METONIC_DAYS  = MA.METONIC_MONTHS * MA.SYNODIC_MONTH_DAYS;   // ~6939.69

  // Zodiac signs.
  // `a` = 3-letter Latin abbreviation (always renders in Cinzel — primary glyph)
  // `g` = Unicode astrological sign (rendered when Noto Sans Symbols 2 is loaded;
  //       used as a secondary ornament under the abbreviation in atrium mode)
  MA.ZODIAC = [
    {n:'Aries',       a:'ARI', g:'♈', s:0},     {n:'Taurus',     a:'TAU', g:'♉', s:30},
    {n:'Gemini',      a:'GEM', g:'♊', s:60},    {n:'Cancer',     a:'CNC', g:'♋', s:90},
    {n:'Leo',         a:'LEO', g:'♌', s:120},   {n:'Virgo',      a:'VIR', g:'♍', s:150},
    {n:'Libra',       a:'LIB', g:'♎', s:180},   {n:'Scorpio',    a:'SCO', g:'♏', s:210},
    {n:'Sagittarius', a:'SGR', g:'♐', s:240},   {n:'Capricorn',  a:'CAP', g:'♑', s:270},
    {n:'Aquarius',    a:'AQR', g:'♒', s:300},   {n:'Pisces',     a:'PSC', g:'♓', s:330}
  ];

  // Egyptian calendar — 12 months × 30 days + 5 epagomenal
  MA.EGYPTIAN_MONTHS = [
    'ΘΩΘ','ΦΑΩΦΙ','ΑΘΥΡ','ΧΟΙΑΚ','ΤΥΒΙ','ΜΕΧΕΙΡ',
    'ΦΑΜΕΝΩΘ','ΦΑΡΜΟΥΘΙ','ΠΑΧΩΝ','ΠΑΥΝΙ','ΕΠΗΦΙ','ΜΕΣΟΡΗ'
  ];

  // Returns 0..1 around the dial for a given JD (one full rev per tropical year)
  MA.yearFraction = function(jdt) {
    // Vernal equinox J2000 was ~2000-03-20; we'll just use start-of-year approximation
    const d = MA.dj(jdt);
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    const end   = Date.UTC(d.getUTCFullYear()+1, 0, 1);
    return (d.getTime() - start) / (end - start);
  };

  /* ══════════════════════════════════════════════════════
     ECLIPSE windows — Saros approximation
     A new/full moon near a node generates an eclipse.
     For UI flashing only; not predictive grade.
     ══════════════════════════════════════════════════════ */
  MA.eclipseProximity = function(jdt) {
    const phase = MA.moonPhase(jdt);
    // Distance from new (0) or full (.5) moon
    const dPhase = Math.min(
      Math.abs(phase), Math.abs(phase - 0.5), Math.abs(phase - 1)
    );
    return dPhase < 0.04; // within ~1.2 days of syzygy
  };

})(window.MA);
