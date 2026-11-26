/**
 * NatalFreeze — birth-moment lock: form → JD T0, horizon split, beacon/ray hooks.
 * Signer: GROKBOT. Uses Codex EphemerisEngine.horizontalCoordinates.
 */
import {
  dateToJulianDay,
  horizontalCoordinates,
  EphemerisEngine
} from './ephemeris.js';

const NATAL_BODIES = [
  'sun',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune'
];

export function parseNatalForm(form) {
  const fd = new FormData(form);
  const year = parseInt(fd.get('year'), 10);
  const month = parseInt(fd.get('month'), 10);
  const day = parseInt(fd.get('day'), 10);
  const hour = parseInt(fd.get('hour'), 10);
  const minute = parseInt(fd.get('minute'), 10);
  const lat = parseFloat(fd.get('lat'));
  const lon = parseFloat(fd.get('lon'));
  if ([year, month, day, hour, minute, lat, lon].some((n) => Number.isNaN(n))) {
    throw new Error('Natal form has invalid numbers');
  }
  return { year, month, day, hour, minute, lat, lon };
}

export function natalDateToJulianDay(fields) {
  return dateToJulianDay(
    fields.year,
    fields.month,
    fields.day,
    fields.hour,
    fields.minute
  );
}

/** Above/below horizon for classic + outer planets at jd/lat/lon. */
export function listHorizonBodies(jd, lat, lon, engine = null) {
  const eph = engine || new EphemerisEngine();
  const horizon = {};
  for (const name of NATAL_BODIES) {
    const { altitude, azimuth } = eph.horizontalCoordinates(name, jd, lat, lon);
    horizon[name] = {
      altitude,
      azimuth,
      above: altitude > 0
    };
  }
  return horizon;
}

export function formatHorizon(horizon) {
  if (!horizon) return '';
  const above = [];
  const below = [];
  for (const [name, info] of Object.entries(horizon)) {
    const label = `${name} (${info.altitude.toFixed(1)}°)`;
    if (info.above) above.push(label);
    else below.push(label);
  }
  return `Above horizon: ${above.join(', ') || '—'}\nBelow horizon: ${below.join(', ') || '—'}`;
}

/**
 * Binds #natal-form / #natal-clear. On submit: lock dial T0, notify scene hooks.
 *
 * options:
 *   form, clearBtn, resultEl
 *   lockDial(jd) — set Antikythera dial
 *   onFreeze({ jd, lat, lon, horizon, fields }) — plant beacon + rays
 *   onClear() — remove beacon/rays
 *   onObserver?(lat, lon) — sync observer site inputs
 *   setCamera?(mode)
 */
export class NatalFreeze {
  constructor(options = {}) {
    this.form = options.form || document.getElementById('natal-form');
    this.clearBtn = options.clearBtn || document.getElementById('natal-clear');
    this.resultEl = options.resultEl || document.getElementById('natal-result');
    this.lockDial = options.lockDial || (() => {});
    this.onFreeze = options.onFreeze || (() => {});
    this.onClear = options.onClear || (() => {});
    this.onObserver = options.onObserver || null;
    this.setCamera = options.setCamera || null;
    this.engine = options.engine || new EphemerisEngine();
    this.last = null;
    this._onSubmit = this._onSubmit.bind(this);
    this._onClearClick = this._onClearClick.bind(this);
  }

  bind() {
    this.form?.addEventListener('submit', this._onSubmit);
    this.clearBtn?.addEventListener('click', this._onClearClick);
    return this;
  }

  unbind() {
    this.form?.removeEventListener('submit', this._onSubmit);
    this.clearBtn?.removeEventListener('click', this._onClearClick);
  }

  freeze(fields) {
    const jd = natalDateToJulianDay(fields);
    const { lat, lon } = fields;
    this.lockDial(jd);
    if (this.onObserver) this.onObserver(lat, lon);
    const horizon = listHorizonBodies(jd, lat, lon, this.engine);
    this.last = { jd, lat, lon, horizon, fields };
    this.onFreeze(this.last);
    if (this.resultEl) {
      this.resultEl.textContent = formatHorizon(horizon);
      this.resultEl.hidden = false;
    }
    if (this.setCamera) this.setCamera('planetary');
    return this.last;
  }

  clear() {
    this.last = null;
    this.onClear();
    if (this.resultEl) {
      this.resultEl.textContent = '';
      this.resultEl.hidden = true;
    }
  }

  _onSubmit(e) {
    e.preventDefault();
    try {
      const fields = parseNatalForm(this.form);
      this.freeze(fields);
    } catch (err) {
      console.warn(err);
      if (this.resultEl) {
        this.resultEl.textContent = String(err.message || err);
        this.resultEl.hidden = false;
      }
    }
  }

  _onClearClick() {
    this.clear();
  }
}

export { NATAL_BODIES, horizontalCoordinates, dateToJulianDay };
export default NatalFreeze;
