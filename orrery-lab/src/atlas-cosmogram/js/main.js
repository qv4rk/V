import { CosmogramScene } from './scene.js';
import { TimeDial } from './antikythera.js';
import { ReadingRoom } from './readingRoom.js';
import { dateToJulianDay } from './ephemeris.js';
import { NatalFreeze } from './natal.js';
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
function $(sel) {
  return document.querySelector(sel);
}
async function boot() {
  const canvas = document.getElementById('globe-canvas');
  const scene = new CosmogramScene(canvas);
  const dial = new TimeDial(dateToJulianDay(1922, 6, 15, 12, 0));
  const room = new ReadingRoom(document.getElementById('reading-room'));
  let articles = [];
  let eclipses = [];
  try {
    [articles, eclipses] = await Promise.all([
      loadJSON('./data/articles.json'),
      loadJSON('./data/eclipses.json')
    ]);
  } catch (err) {
    console.warn(err);
  }
  scene.nodes.loadArticles(articles);
  dial.setEclipses(eclipses);
  const eclipseSelect = $('#eclipse-select');
  if (eclipseSelect) {
    eclipseSelect.innerHTML = '<option value="">Eclipse presets…</option>';
    eclipses.forEach((e, i) => {
      const opt = document.createElement('option');
      opt.value = e.id || String(i);
      const y = e.year < 1 ? `${1 - e.year} BCE` : `${e.year} CE`;
      opt.textContent = `${e.name} (${y})`;
      eclipseSelect.appendChild(opt);
    });
    eclipseSelect.addEventListener('change', () => {
      const v = eclipseSelect.value;
      if (!v) return;
      dial.goToEclipse(v);
    });
  }
  const dateLabel = $('#dial-date-label');
  const jdSlider = $('#jd-slider');
  function syncUI({ jd, year }) {
    if (dateLabel) dateLabel.textContent = dial.formatLabel();
    if (jdSlider) {
      const t =
        (jd - TimeDial.JD_MIN) / (TimeDial.JD_MAX - TimeDial.JD_MIN);
      jdSlider.value = String(Math.max(0, Math.min(1, t)));
    }
    scene.setJulianDay(jd);
    scene.updateTemporalHorizon(year);
    if (scene.mode === 'observer') {
      scene._updateObserverSkyBodies();
    }
  }
  dial.onChange(syncUI);
  syncUI({ jd: dial.getJulianDay(), calendar: dial.getCalendar(), year: dial.getYear() });
  document.querySelectorAll('[data-scrub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const unit = btn.getAttribute('data-scrub');
      const dir = Number(btn.getAttribute('data-dir') || '1');
      dial.scrub(unit, dir);
    });
  });
  if (jdSlider) {
    jdSlider.addEventListener('input', () => {
      const t = Number(jdSlider.value);
      const jd = TimeDial.JD_MIN + t * (TimeDial.JD_MAX - TimeDial.JD_MIN);
      dial.setJulianDay(jd);
    });
  }
  const camPlanetary = $('#cam-planetary');
  const camObserver = $('#cam-observer');
  function setCam(mode) {
    scene.setCameraMode(mode);
    camPlanetary?.classList.toggle('active', mode === 'planetary');
    camObserver?.classList.toggle('active', mode === 'observer');
    const hint = $('#observer-hint');
    if (hint) hint.hidden = mode !== 'observer';
  }
  camPlanetary?.addEventListener('click', () => setCam('planetary'));
  camObserver?.addEventListener('click', () => setCam('observer'));
  setCam('planetary');
  const obsLat = $('#obs-lat');
  const obsLon = $('#obs-lon');
  function applyObserver() {
    const lat = parseFloat(obsLat?.value || '40.7');
    const lon = parseFloat(obsLon?.value || '-74');
    scene.setObserver(lat, lon);
  }
  obsLat?.addEventListener('change', applyObserver);
  obsLon?.addEventListener('change', applyObserver);
  applyObserver();
  new NatalFreeze({
    form: $('#natal-form'),
    clearBtn: $('#natal-clear'),
    resultEl: $('#natal-result'),
    lockDial: (jd) => dial.setJulianDay(jd),
    onObserver: (lat, lon) => {
      scene.setObserver(lat, lon);
      if (obsLat) obsLat.value = String(lat);
      if (obsLon) obsLon.value = String(lon);
    },
    onFreeze: ({ jd, lat, lon, horizon }) => {
      scene.setNatalFreeze(jd, lat, lon, horizon);
      const a = scene.natal && scene.natal.horizon && scene.natal.horizon.ascendant;
      const el = $('#natal-result');
      if (a && el) setTimeout(() => { el.textContent += `\nAscendant: ${a.sign} ${a.degree.toFixed(1)}°`; }, 0);
    },
    onClear: () => scene.clearNatal(),
    setCamera: setCam
  }).bind();
  scene.onNodeClick = (data) => {
    // Pass full article (incl. locales) so ?lang=ar|he|zh reach Reading Room
    room.open(data.article || data);
  };
  document.querySelectorAll('[data-toggle-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggle-panel');
      const panel = document.getElementById(id);
      panel?.classList.toggle('collapsed');
    });
  });
  scene.animate();
}
boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('boot-error');
  if (el) {
    el.hidden = false;
    el.textContent = 'Could not start the atlas. Check the browser console.';
  }
});
