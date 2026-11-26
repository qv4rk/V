/**
 * Reading Room — sliding drawer over blurred canvas.
 * Optional article.locales.{ar|he|zh} + ?lang= / <html lang>.
 */

function resolveLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q) return q.toLowerCase().split('-')[0];
  return (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
}

function localizeArticle(article, lang) {
  if (!article) return article;
  const loc = article.locales && article.locales[lang];
  if (!loc) return { ...article, _lang: 'en' };
  return {
    ...article,
    title: loc.title || article.title,
    excerpt: loc.excerpt || article.excerpt,
    place: loc.place || article.place,
    _lang: lang
  };
}

/** Civil year → Hebrew year letters (year-only; 1824 → תקפ״ד). */
function hebrewYearGematria(year) {
  if (year < 1) return null;
  let n = (year + 3760) % 1000;
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  let s = hundreds[Math.floor(n / 100)] || '';
  n %= 100;
  if (n === 15) s += 'טו';
  else if (n === 16) s += 'טז';
  else {
    s += tens[Math.floor(n / 10)] || '';
    s += ones[n % 10] || '';
  }
  if (s.length >= 2) return s.slice(0, -1) + '״' + s.slice(-1);
  return s || null;
}

/** Civil year → Qing reign year (嘉庆/道光/…); else null. */
function qingReignYear(year) {
  if (year < 1644 || year > 1911) return null;
  const eras = [
    { name: '顺治', start: 1644 },
    { name: '康熙', start: 1662 },
    { name: '雍正', start: 1723 },
    { name: '乾隆', start: 1736 },
    { name: '嘉庆', start: 1796 },
    { name: '道光', start: 1821 },
    { name: '咸丰', start: 1851 },
    { name: '同治', start: 1862 },
    { name: '光绪', start: 1875 },
    { name: '宣统', start: 1909 }
  ];
  let era = eras[0];
  for (const e of eras) {
    if (year >= e.start) era = e;
  }
  const n = year - era.start + 1;
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  let num;
  if (n <= 10) num = n === 10 ? '十' : digits[n];
  else if (n < 20) num = '十' + (n % 10 ? digits[n % 10] : '');
  else if (n % 10 === 0) num = digits[Math.floor(n / 10)] + '十';
  else num = digits[Math.floor(n / 10)] + '十' + digits[n % 10];
  return era.name + num + '年';
}


/** Civil year → approximate Hijri year (year-only; 1824 → 1239 هـ). */
function approxHijriYear(year) {
  if (year == null || Number.isNaN(year)) return null;
  // Astronomical year → Hijri: rough civil conversion (not calendar-exact).
  const hijri = Math.round(year - 622 + (year - 622) / 32);
  return hijri;
}

export class ReadingRoom {
  constructor(rootEl) {
    this.root = rootEl;
    this.titleEl = rootEl.querySelector('[data-rr-title]');
    this.metaEl = rootEl.querySelector('[data-rr-meta]');
    this.excerptEl = rootEl.querySelector('[data-rr-excerpt]');
    this.closeBtn = rootEl.querySelector('[data-rr-close]');
    this.backdrop = document.getElementById('rr-backdrop');
    this.canvas = document.getElementById('globe-canvas');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  isOpen() {
    return this.root.classList.contains('open');
  }

  open(article) {
    if (!article) return;
    const lang = resolveLang();
    const a = localizeArticle(article, lang);
    const rtl = lang === 'ar' || lang === 'he';

    this.root.dir = rtl ? 'rtl' : 'ltr';
    this.root.lang = a._lang || 'en';

    if (this.titleEl) this.titleEl.textContent = a.title || '';
    if (this.metaEl) {
      const year = a.year;
      const place = a.place || '';
      let yearPart;
      if (lang === 'he' && year >= 1) {
        yearPart = hebrewYearGematria(year) || String(year);
      } else if (lang === 'zh') {
        const qing = year >= 1 ? qingReignYear(year) : null;
        if (qing) yearPart = qing;
        else if (year < 1) yearPart = `公元前${1 - year}年`;
        else yearPart = `西元${year}年`;
      } else if (lang === 'ar') {
        const h = approxHijriYear(year);
        if (h == null) yearPart = String(year);
        else if (h < 1) yearPart = `${1 - h} ق.م.`;
        else yearPart = `${h} هـ`;
      } else {
        const era = year < 1 ? 'BCE' : 'CE';
        const yDisp = year < 1 ? 1 - year : year;
        yearPart = `${yDisp} ${era}`;
      }
      this.metaEl.textContent = `${yearPart}${place ? ' · ' + place : ''}`;
    }
    if (this.excerptEl) this.excerptEl.textContent = a.excerpt || '';
    this.root.classList.add('open');
    this.root.setAttribute('aria-hidden', 'false');
    if (this.backdrop) this.backdrop.classList.add('visible');
    if (this.canvas) this.canvas.classList.add('blurred');
  }

  close() {
    this.root.classList.remove('open');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.dir = 'ltr';
    if (this.backdrop) this.backdrop.classList.remove('visible');
    if (this.canvas) this.canvas.classList.remove('blurred');
  }
}

export default ReadingRoom;
