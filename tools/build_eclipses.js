#!/usr/bin/env node
/* Builds data/eclipses.json: every solar and lunar eclipse from 2000 BCE
 * to 3000 CE, computed with Astronomy Engine (the same library the Natal
 * Chart uses).  Run:  node tools/build_eclipses.js
 *
 * Each row is compact:  [type, kind, ISO peak time (UT), lat, lon]
 *   type  "S" solar | "L" lunar
 *   kind  total | annular | partial | hybrid | penumbral
 *   lat/lon  where the Moon's shadow axis is closest to Earth's centre
 *            (solar total/annular only; null otherwise)
 */
const path = require('path');
const fs = require('fs');
const Astronomy = require(path.join(__dirname, '../apps/webapps/natal-chart/lib/astronomy-engine.min.js'));

const START = Astronomy.MakeTime(-4000 * 365.25);   // ~2000 BCE (J2000 minus 4,000 years)
const END_YEAR = 3000;
const rows = [];

function iso(t) { return t.date.toISOString().replace(/\.\d+Z$/, 'Z'); }
function year(t) { return t.date.getUTCFullYear(); }

let s = Astronomy.SearchGlobalSolarEclipse(START);
while (year(s.peak) <= END_YEAR) {
  const hasPath = s.latitude !== undefined && !isNaN(s.latitude);
  rows.push([s.peak.ut, 'S', s.kind, iso(s.peak), hasPath ? +s.latitude.toFixed(2) : null, hasPath ? +s.longitude.toFixed(2) : null]);
  s = Astronomy.NextGlobalSolarEclipse(s.peak);
}
let l = Astronomy.SearchLunarEclipse(START);
while (year(l.peak) <= END_YEAR) {
  rows.push([l.peak.ut, 'L', l.kind, iso(l.peak), null, null]);
  l = Astronomy.NextLunarEclipse(l.peak);
}
rows.sort((a, b) => a[0] - b[0]);
rows.forEach(r => r.shift());
fs.writeFileSync(path.join(__dirname, '../data/eclipses.json'), JSON.stringify(rows));
console.log(rows.length + ' eclipses', rows[0][2], '→', rows[rows.length - 1][2]);
