/**
 * TimeDial — Julian Day state + scrub API (centuries → hours).
 */
import { dateToJulianDay, jdToCalendar, yearFromJd } from './ephemeris.js';

const JD_MIN = dateToJulianDay(-3000, 1, 1, 12, 0); // ~3000 BCE
const JD_MAX = dateToJulianDay(3000, 12, 31, 12, 0); // 3000 CE

export class TimeDial {
  constructor(initialJd = dateToJulianDay(2000, 1, 1, 12, 0)) {
    this.jd = this.clamp(initialJd);
    this.listeners = new Set();
    this.eclipses = [];
  }

  clamp(jd) {
    return Math.max(JD_MIN, Math.min(JD_MAX, jd));
  }

  getJulianDay() {
    return this.jd;
  }

  getCalendar() {
    return jdToCalendar(this.jd);
  }

  getYear() {
    return yearFromJd(this.jd);
  }

  setJulianDay(jd, silent = false) {
    this.jd = this.clamp(jd);
    if (!silent) this._emit();
  }

  setDate(year, month, day, hour = 12, minute = 0) {
    this.setJulianDay(dateToJulianDay(year, month, day, hour, minute));
  }

  /** Step by signed units: century, decade, year, day, hour */
  scrub(unit, steps = 1) {
    const cal = this.getCalendar();
    let { year, month, day, hour, minute } = cal;
    const n = steps;
    switch (unit) {
      case 'century':
        year += 100 * n;
        break;
      case 'decade':
        year += 10 * n;
        break;
      case 'year':
        year += n;
        break;
      case 'day':
        this.setJulianDay(this.jd + n);
        return;
      case 'hour':
        this.setJulianDay(this.jd + n / 24);
        return;
      default:
        return;
    }
    // Clamp day for month length roughly
    const dim = daysInMonth(year, month);
    if (day > dim) day = dim;
    this.setDate(year, month, day, hour, minute);
  }

  setEclipses(list) {
    this.eclipses = list || [];
  }

  /** Jump to a preset eclipse by id or index */
  goToEclipse(idOrIndex) {
    let e;
    if (typeof idOrIndex === 'number') {
      e = this.eclipses[idOrIndex];
    } else {
      e = this.eclipses.find((x) => x.id === idOrIndex);
    }
    if (!e) return null;
    if (e.jd) {
      this.setJulianDay(e.jd);
    } else {
      this.setDate(e.year, e.month || 1, e.day || 1, e.hour || 12, 0);
    }
    return e;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    const payload = { jd: this.jd, calendar: this.getCalendar(), year: this.getYear() };
    for (const fn of this.listeners) fn(payload);
  }

  formatLabel() {
    const c = this.getCalendar();
    const era = c.year < 1 ? 'BCE' : 'CE';
    const yDisp = c.year < 1 ? 1 - c.year : c.year;
    const mon = String(c.month).padStart(2, '0');
    const day = String(c.day).padStart(2, '0');
    const hh = String(c.hour).padStart(2, '0');
    const mm = String(c.minute).padStart(2, '0');
    return `${yDisp} ${era}-${mon}-${day} ${hh}:${mm} UT  ·  JD ${this.jd.toFixed(2)}`;
  }

  static get JD_MIN() {
    return JD_MIN;
  }
  static get JD_MAX() {
    return JD_MAX;
  }
}

function daysInMonth(year, month) {
  return new Date(year > 0 ? year : year + 1, month, 0).getDate() || 28;
}

export default TimeDial;
