(function () {
  'use strict';

  // Experimental merged layout: same tracker engine as accessible.js
  // (localStorage log/cap/quick-add/methioninase, voice + barcode search,
  // undo, share/print) plus photo-identified search cards ported from
  // app.js and an explicit portion picker instead of a fixed 100g add.
  const CONFIG = window.UNIFIED_CONFIG || {};
  const KEY_PREFIX = CONFIG.storagePrefix || 'unified_';

  const LOG_KEY = KEY_PREFIX + 'feisttech_met_daily_log';
  const CAP_KEY = KEY_PREFIX + 'feisttech_met_daily_cap';
  const PROTEIN_GOAL_KEY = KEY_PREFIX + 'feisttech_met_protein_goal';
  const CALORIE_GOAL_KEY = KEY_PREFIX + 'feisttech_met_calorie_goal';
  const QUICKADD_KEY = KEY_PREFIX + 'feisttech_met_accessible_quickadd';
  const QUICKADD_CACHE_KEY = KEY_PREFIX + 'feisttech_met_accessible_quickadd_cache';
  const METHIO_KEY = KEY_PREFIX + 'feisttech_met_methioninase_log';

  // A neutral starting list, not a medical recommendation — replace this
  // with whatever the care team has actually approved via "Edit This List".
  const DEFAULT_QUICKADD = [
    'Apple', 'Banana', 'White rice, cooked', 'Broccoli, cooked',
    'Baked potato', 'Applesauce', 'Grapes', 'Carrots, cooked'
  ];

  // Non-meat proteins conventionally used in low-methionine diets because
  // methionine tends to be their most limiting amino acid relative to
  // protein content — legumes and wheat gluten in particular carry
  // noticeably less methionine per gram of protein than meat, egg, or
  // dairy. That's a well-established property of these food categories,
  // not a specific mg claim — like DEFAULT_QUICKADD, every number still
  // comes from a live USDA lookup with its own measured/estimate badge,
  // never a value baked into this list.
  const PROTEIN_LOW_MET_PICKS = [
    'Tofu, firm', 'Tempeh', 'Edamame, cooked', 'Lentils, cooked',
    'Black beans, cooked', 'Chickpeas, cooked', 'Seitan',
    'Peanut butter', 'Quinoa, cooked', 'Hummus'
  ];

  // Log storage is date-partitioned ({ '2026-09-13': [items...] }), same
  // shape as METHIO_KEY, so a patient can review or correct a past day
  // without it bleeding into today's total. `log` is always a live
  // reference to logByDay[viewDate] — setLog() keeps that in sync on any
  // reassignment (filter/pop return a new array).
  let logByDay = {};
  let viewDate = null; // set in loadState(); an ISO date, never in the future
  let log = [];
  // No silent default: a methionine ceiling is a number that comes from
  // an oncologist/dietitian, not a guess this app should make for a
  // patient. Stays null (shown as "no limit set", onboarding prompts for
  // it) until the patient enters one — unless a care team has locked a
  // specific value in via CONFIG, in which case that's authoritative and
  // there's nothing to ask.
  let dailyCap = CONFIG.lockCap ? (CONFIG.defaultCap || 150) : null;
  // Protein/calorie goals are a floor, not a ceiling — watched to catch
  // cachexia/muscle-wasting risk, not to restrict intake. Also null
  // until set; unlike dailyCap there's no onboarding gate for these,
  // since they're a secondary safety net rather than the core number
  // the whole tracker exists to enforce.
  let proteinGoal = null;
  let calorieGoal = null;
  let quickAddFoods = DEFAULT_QUICKADD.slice();
  let quickAddCache = {};
  let lastAction = null; // { id, delta, wasNew } — what "Undo Last Add" should reverse
  let html5Qrcode = null;

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function addDaysISO(iso, delta) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }
  function dayPhrase() {
    if (viewDate === todayISO()) return 'today';
    if (viewDate === addDaysISO(todayISO(), -1)) return 'yesterday';
    return `on ${formatDayLabel(viewDate)}`;
  }
  function formatDayLabel(iso) {
    const today = todayISO();
    if (iso === today) return 'Today';
    if (iso === addDaysISO(today, -1)) return 'Yesterday';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  function setLog(newArr) {
    log = newArr;
    logByDay[viewDate] = newArr;
  }

  // ── Storage health: every save below used to swallow a failed
  // localStorage write with a bare `catch (e) {}`, so on a browser that
  // blocks storage for this site (blocked cookies/site data, Incognito,
  // or — the single most common desktop-Chrome case — the page opened
  // as a local file:// instead of through the real web address) nothing
  // ever persisted and there was no way to tell why. safeSet() surfaces
  // that as a visible, sticky warning instead of failing silently. ──
  let storageWarned = false;
  function showStorageWarning(message) {
    if (storageWarned) return; // don't stack repeat warnings for the same session
    storageWarned = true;
    const el = document.getElementById('storageWarning');
    if (!el) return;
    el.textContent = '⚠️ ' + message;
    el.hidden = false;
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      showStorageWarning('Your changes aren\'t being saved on this device. This browser is blocking storage for this site — check that cookies/site data aren\'t blocked and that you\'re not in Incognito/Private Browsing. Use "Export Save File" below to back up what you\'ve entered manually until this is fixed.');
      return false;
    }
  }
  function checkStoragePersistence() {
    if (window.location.protocol === 'file:') {
      showStorageWarning('This page was opened as a local file, not through a real web address. Chrome (and most browsers) block saving between visits for local files — open it via https://... instead of double-clicking the file, or nothing you enter will be there next time.');
      return false;
    }
    try {
      const testKey = KEY_PREFIX + '__storage_test__';
      localStorage.setItem(testKey, '1');
      const ok = localStorage.getItem(testKey) === '1';
      localStorage.removeItem(testKey);
      if (!ok) throw new Error('readback mismatch');
      return true;
    } catch (e) {
      showStorageWarning('This browser isn\'t saving data between visits for this site. Check that cookies/site data aren\'t blocked, and that you\'re not in Incognito/Private Browsing — both stop this tracker from remembering anything after you close the tab.');
      return false;
    }
  }

  function loadState() {
    viewDate = todayISO();
    try {
      const raw = JSON.parse(localStorage.getItem(LOG_KEY) || 'null');
      if (Array.isArray(raw)) {
        // Pre-multi-day format: one flat array with no date attached.
        // Migrate it onto today rather than discarding it.
        logByDay = raw.length ? { [viewDate]: raw } : {};
      } else {
        logByDay = raw && typeof raw === 'object' ? raw : {};
      }
    } catch (e) { logByDay = {}; }
    log = logByDay[viewDate] || (logByDay[viewDate] = []);

    try {
      const cap = parseFloat(localStorage.getItem(CAP_KEY));
      if (!isNaN(cap) && cap > 0) dailyCap = cap;
      const pGoal = parseFloat(localStorage.getItem(PROTEIN_GOAL_KEY));
      if (!isNaN(pGoal) && pGoal > 0) proteinGoal = pGoal;
      const cGoal = parseFloat(localStorage.getItem(CALORIE_GOAL_KEY));
      if (!isNaN(cGoal) && cGoal > 0) calorieGoal = cGoal;
    } catch (e) {}
    try {
      const saved = JSON.parse(localStorage.getItem(QUICKADD_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) quickAddFoods = saved;
    } catch (e) {}
    try { quickAddCache = JSON.parse(localStorage.getItem(QUICKADD_CACHE_KEY) || '{}'); } catch (e) { quickAddCache = {}; }
  }
  function saveLog() {
    safeSet(LOG_KEY, JSON.stringify(logByDay));
  }
  function saveCap() {
    safeSet(CAP_KEY, String(dailyCap));
  }
  function saveProteinGoal() {
    safeSet(PROTEIN_GOAL_KEY, String(proteinGoal));
  }
  function saveCalorieGoal() {
    safeSet(CALORIE_GOAL_KEY, String(calorieGoal));
  }
  function saveQuickAdd() {
    safeSet(QUICKADD_KEY, JSON.stringify(quickAddFoods));
  }
  function saveQuickAddCache() {
    safeSet(QUICKADD_CACHE_KEY, JSON.stringify(quickAddCache));
  }
  function loadMethio() {
    try { return JSON.parse(localStorage.getItem(METHIO_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMethio(all) {
    safeSet(METHIO_KEY, JSON.stringify(all));
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return Math.round(n * 10) / 10;
  }
  function capText() {
    return dailyCap === null || dailyCap === undefined ? 'not set yet' : `${fmt(dailyCap)} mg`;
  }
  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Same estimate model as the other two apps: when USDA has no measured
  // methionine, approximate it from protein content. These percentages
  // are placeholders, not sourced from published amino-acid literature —
  // that's why every estimated value stays loudly marked as a guess.
  const MEAT_WORDS = ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'poultry', 'bacon', 'sausage', 'veal', 'duck', 'goat', 'meat', 'steak', 'ham'];
  const CANNED_WORDS = ['canned', 'can,', 'in syrup', 'in brine', 'in sauce'];
  function estimateMethionineRate(description) {
    const d = (description || '').toLowerCase();
    if (CANNED_WORDS.some(w => d.includes(w))) return 0.025;
    if (MEAT_WORDS.some(w => d.includes(w))) return 0.035;
    return 0.015;
  }
  function estimateMethionine(proteinG, description) {
    if (proteinG === null || proteinG === undefined) return null;
    return proteinG * estimateMethionineRate(description) * 1000;
  }

  // ── Food icons/photos (ported from app.js) ──
  // unified/index.html sits one directory below where images/ lives, same
  // depth as detailed/ and accessible/, so the relative path is unchanged.
  const FOOD_IMG = '../images/food/';
  const CARD_ICONS = [
    [/chicken|turkey|duck|poultry/i, '🍗'], [/beef|steak|pork|lamb|veal|ham|bacon|sausage/i, '🥩'],
    [/fish|salmon|tuna|shrimp|seafood/i, '🐟'], [/egg/i, '🥚'], [/rice/i, '🍚'],
    [/broccoli/i, '🥦'], [/cauliflower/i, '🥦'], [/spinach|kale|lettuce|greens/i, '🥬'],
    [/tomato/i, '🍅'], [/potato/i, '🥔'], [/banana/i, '🍌'], [/apple/i, '🍎'],
    [/berry|berries/i, '🫐'], [/mango/i, '🥭'], [/orange|citrus|grapefruit/i, '🍊'],
    [/yogurt|milk|cheese|dairy/i, '🧀'], [/bean|lentil|legume/i, '🫘'], [/bread|grain|oat|wheat/i, '🌾'],
    [/oil/i, '🫒'], [/nut|almond|walnut/i, '🥜']
  ];
  function iconFor(description) {
    const match = CARD_ICONS.find(([re]) => re.test(description || ''));
    return match ? match[1] : '🍽️';
  }
  const CARD_PHOTOS = [
    // Must come before the generic /broccoli/i entry below: broccoli
    // raab is a different (bitter, leafy) vegetable, not a crown of
    // broccoli, and showing the crown-broccoli stock photo on a raab
    // card visually confirms a mismatch a patient has no way to catch.
    // null here means "no dedicated photo" — falls through to the
    // generic icon+text placeholder instead of a misleading real photo.
    [/raab/i, null],
    [/sweet potato/i, FOOD_IMG + 'sweet_potato.png'],
    [/ground beef/i, FOOD_IMG + 'ground_beef.png'],
    [/black bean/i, FOOD_IMG + 'black_beans.png'],
    [/canned tuna|tuna, canned/i, FOOD_IMG + 'canned_tuna.png'],
    [/applesauce/i, FOOD_IMG + 'applesauce.png'],
    [/turkey/i, FOOD_IMG + 'turkey.png'],
    [/chicken|duck|poultry/i, FOOD_IMG + 'chicken_breast.png'],
    [/beef|steak/i, FOOD_IMG + 'beef_steak.png'],
    [/pork|ham|bacon|sausage/i, FOOD_IMG + 'pork_sausage_bacon.png'],
    [/salmon/i, FOOD_IMG + 'salmon.png'],
    [/shrimp|scallop|seafood/i, FOOD_IMG + 'shrimp_seafood.png'],
    [/tuna|fish/i, FOOD_IMG + 'canned_tuna.png'],
    [/tofu/i, FOOD_IMG + 'tofu.png'],
    [/egg/i, FOOD_IMG + 'egg.png'],
    [/rice/i, FOOD_IMG + 'white_rice.png'],
    [/pasta|spaghetti|noodle/i, FOOD_IMG + 'pasta.png'],
    [/broccoli/i, FOOD_IMG + 'broccoli.png'],
    [/cauliflower/i, FOOD_IMG + 'cauliflower.png'],
    [/shiitake|mushroom/i, FOOD_IMG + 'shiitake_mushrooms.png'],
    [/spinach|kale/i, FOOD_IMG + 'spinach_kale.png'],
    [/lettuce|salad greens/i, FOOD_IMG + 'salad_greens.png'],
    [/cabbage/i, FOOD_IMG + 'cabbage.png'],
    [/tomato/i, FOOD_IMG + 'tomato.png'],
    [/potato/i, FOOD_IMG + 'baked_potato.png'],
    [/onion/i, FOOD_IMG + 'onion.png'],
    [/cucumber/i, FOOD_IMG + 'cucumber.png'],
    [/carrot/i, FOOD_IMG + 'carrots.png'],
    [/avocado/i, FOOD_IMG + 'avocado.png'],
    [/asparagus/i, FOOD_IMG + 'asparagus.png'],
    [/brussels/i, FOOD_IMG + 'brussels_sprouts.png'],
    [/banana/i, FOOD_IMG + 'banana.png'],
    [/apple/i, FOOD_IMG + 'apple.png'],
    [/grape/i, FOOD_IMG + 'grapes.png'],
    [/melon|cantaloupe|honeydew/i, FOOD_IMG + 'melon.png'],
    [/mango/i, FOOD_IMG + 'mango.png'],
    [/orange|citrus|grapefruit/i, FOOD_IMG + 'orange.png'],
    [/blueberr/i, FOOD_IMG + 'blueberries.png'],
    [/berry|berries/i, FOOD_IMG + 'mixed_berries.png'],
    [/yogurt/i, FOOD_IMG + 'greek_yogurt.png'],
    [/bread|oat|wheat/i, FOOD_IMG + 'bread_oats.png'],
    [/oil/i, FOOD_IMG + 'olive_oil.png'],
    [/nut|almond|walnut/i, FOOD_IMG + 'nuts.png'],
    [/pizza/i, FOOD_IMG + 'pizza.png'],
    [/soup/i, FOOD_IMG + 'soup.png']
  ];
  function photoFor(description) {
    const match = CARD_PHOTOS.find(([re]) => re.test(description || ''));
    return match ? match[1] : null;
  }
  function placeholderPhoto(description) {
    return `https://placehold.co/600x400/1e293b/e5e7eb?font=roboto&text=${encodeURIComponent(iconFor(description) + '  ' + (description || 'Food').slice(0, 28))}`;
  }

  function totalMet() {
    return log.reduce((sum, i) => sum + (i.met || 0), 0);
  }
  function totalField(field) {
    return log.reduce((sum, i) => sum + (i[field] || 0), 0);
  }
  // Cystine has no estimate heuristic (unlike methionine) — only real
  // USDA measurements count, so this total is honestly incomplete
  // whenever hasAnyCysMissing() is true, rather than silently guessing.
  function totalCys() {
    return log.reduce((sum, i) => sum + (i.cys || 0), 0);
  }
  function hasAnyCysMissing() {
    return log.some(i => (i.cys === null || i.cys === undefined));
  }

  // Rough guesses stay IN the total rather than being silently excluded
  // — leaving out an unknown number would make the total look lower
  // than reality, which is more dangerous for a restriction than an
  // honestly-flagged overestimate. The flag just makes sure the big
  // number never looks more certain than it is.
  function hasEstimatedContribution() {
    return log.some(i => i.metEstimated && i.met);
  }

  function statusFor(total) {
    if (dailyCap === null || dailyCap === undefined) return 'unset';
    if (dailyCap <= 0) return 'safe';
    const pct = total / dailyCap;
    if (pct > 1) return 'over';
    if (pct >= 0.8) return 'caution';
    return 'safe';
  }
  function statusLabel(status) {
    if (status === 'unset') return 'No daily limit set yet';
    return status === 'safe' ? 'Safe' : (status === 'caution' ? 'Close to the limit' : 'Over the limit');
  }
  // Protein/calorie adequacy is a FLOOR — 'good' at or above goal is the
  // safe end, 'low' well under goal is the end that risks cachexia. Kept
  // distinct from statusFor's ceiling-style names so the sense is never
  // ambiguous in code (an adequacy 'over' would misleadingly read like
  // "too much protein", which is not the risk being watched here).
  function adequacyStatus(actual, goal) {
    if (!goal) return null;
    const pct = actual / goal;
    if (pct >= 1) return 'good';
    if (pct >= 0.7) return 'watch';
    return 'low';
  }

  // ── Big total ──
  function renderTotal() {
    const total = totalMet();
    const status = statusFor(total);
    const hasCap = dailyCap !== null && dailyCap !== undefined;
    const remaining = hasCap ? Math.max(0, dailyCap - total) : null;

    const pill = document.getElementById('statusPill');
    pill.className = 'statusPill ' + status;
    pill.textContent = status === 'unset' ? 'SET YOUR LIMIT'
      : status === 'safe' ? 'SAFE' : (status === 'caution' ? 'CLOSE TO LIMIT' : 'OVER LIMIT');

    const big = document.getElementById('bigTotal');
    big.className = 'bigTotal ' + status;
    big.innerHTML = fmt(total) + '<span class="bigTotalUnit"> / ' + (hasCap ? fmt(dailyCap) + ' mg' : ' no limit set') + '</span>';

    const pct = hasCap && dailyCap > 0 ? Math.min(100, (total / dailyCap) * 100) : 0;
    const fill = document.getElementById('bigBarFill');
    fill.style.width = pct + '%';
    fill.className = 'bigBarFill' + (status !== 'safe' && status !== 'unset' ? ' ' + status : '');

    document.getElementById('bigSubline').textContent = hasCap
      ? `${fmt(total)} mg used ${dayPhrase()} · ${fmt(remaining)} mg still safe to eat`
      : `${fmt(total)} mg used ${dayPhrase()} · set a daily limit below to see how much is safe to eat`;

    document.getElementById('btnEditCap').textContent = hasCap ? 'Change daily limit' : 'Set your daily limit';

    const macroLine = document.getElementById('macroLine');
    if (macroLine) {
      if (log.length) {
        macroLine.hidden = false;
        macroLine.textContent =
          `${fmt(totalField('cal'))} kcal · ${fmt(totalField('protein'))} g protein · ` +
          `${fmt(totalField('fat'))} g fat · ${fmt(totalField('carbs'))} g carbs`;
      } else {
        macroLine.hidden = true;
      }
    }

    const sulfurLine = document.getElementById('sulfurLine');
    if (sulfurLine) {
      if (log.length) {
        sulfurLine.hidden = false;
        const sulfurTotal = total + totalCys();
        sulfurLine.textContent = `Total sulfur amino acids (Met + Cys): ${fmt(sulfurTotal)} mg` +
          (hasAnyCysMissing() ? ' — incomplete, cystine not measured for every item' : '');
      } else {
        sulfurLine.hidden = true;
      }
    }

    const warn = document.getElementById('estimateWarning');
    if (warn) warn.hidden = !hasEstimatedContribution();

    document.getElementById('btnUndo').disabled = log.length === 0;
    renderAdequacy();
  }

  // ── Protein/calorie adequacy meters — a floor to watch, not a ceiling
  // to enforce, so a patient restricting methionine doesn't end up
  // under-eating overall and risking cachexia/muscle wasting. Off by
  // default (no goal, no meter, no false confidence) until a goal is
  // actually set. ──
  function renderAdequacy() {
    const hasProteinGoal = !!proteinGoal;
    const hasCalorieGoal = !!calorieGoal;
    const hasAnyGoal = hasProteinGoal || hasCalorieGoal;

    document.getElementById('btnSetGoals').hidden = hasAnyGoal;
    document.getElementById('btnEditGoals').hidden = !hasAnyGoal;
    document.getElementById('adequacyBlock').hidden = !hasAnyGoal || !log.length;

    const proteinRow = document.getElementById('proteinRow');
    proteinRow.hidden = !hasProteinGoal;
    if (hasProteinGoal) {
      const protein = totalField('protein');
      const status = adequacyStatus(protein, proteinGoal);
      document.getElementById('proteinValue').textContent = `${fmt(protein)} / ${fmt(proteinGoal)} g`;
      document.getElementById('proteinFill').style.width = Math.min(100, (protein / proteinGoal) * 100) + '%';
      document.getElementById('proteinFill').className = 'adequacyFill ' + status;
    }

    const calorieRow = document.getElementById('calorieRow');
    calorieRow.hidden = !hasCalorieGoal;
    if (hasCalorieGoal) {
      const cal = totalField('cal');
      const status = adequacyStatus(cal, calorieGoal);
      document.getElementById('calorieValue').textContent = `${fmt(cal)} / ${fmt(calorieGoal)} kcal`;
      document.getElementById('calorieFill').style.width = Math.min(100, (cal / calorieGoal) * 100) + '%';
      document.getElementById('calorieFill').className = 'adequacyFill ' + status;
    }
  }

  // ── Day switcher: browse/correct a previous day without it counting
  // toward today's total. Never lets viewDate go past today — logging
  // the future isn't a thing. ──
  function renderDayBar() {
    const isToday = viewDate === todayISO();
    const label = document.getElementById('dayLabel');
    if (label) label.textContent = formatDayLabel(viewDate);
    const next = document.getElementById('btnNextDay');
    if (next) next.disabled = viewDate >= todayISO();
    const picker = document.getElementById('dayPicker');
    if (picker) { picker.value = viewDate; picker.max = todayISO(); }
    const jump = document.getElementById('btnJumpToday');
    if (jump) jump.hidden = isToday;
    const heading = document.getElementById('logHeading');
    // "What's Logged" (not "What WAS Logged") deliberately — this stays
    // an editable catalog for a past day, not a read-only history view,
    // since patients need to be able to fill in a day they missed.
    if (heading) heading.textContent = isToday
      ? "What's Been Logged Today"
      : `What's Logged — ${formatDayLabel(viewDate)}`;
    const banner = document.getElementById('loggingForBanner');
    if (banner) banner.hidden = isToday;
    const bannerDate = document.getElementById('loggingForDate');
    if (bannerDate) bannerDate.textContent = formatDayLabel(viewDate);
  }
  function goToDay(iso) {
    if (iso > todayISO()) return;
    viewDate = iso;
    // Deliberately NOT logByDay[viewDate] = log here — just browsing to a
    // day (e.g. tapping ◀ a few times to find the right one to catalog)
    // must not plant a permanent empty entry for every day passed
    // through. addFoodToLog attaches the array via setLog() only when
    // something is actually added, so an unvisited-but-browsed day never
    // shows up in the compliance summary as a hollow "0 mg, Not logged"
    // day.
    log = logByDay[viewDate] || [];
    lastAction = null; // undo history doesn't carry across days
    renderAll();
    renderDayBar();
    renderMethio();
  }
  function switchDay(deltaDays) {
    goToDay(addDaysISO(viewDate, deltaDays));
  }
  function jumpToToday() {
    goToDay(todayISO());
  }

  // ── Toast ──
  let toastTimer = null;
  function showToast(message, status) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (status ? ' ' + status : '');
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  // ── Adding / removing items ──
  function addFoodToLog(food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const metEstimated = !hasMet;
    const metPer100 = hasMet ? n.methionine : estimateMethionine(n.protein, food.description);
    const met = metPer100 !== null ? metPer100 * scale : null;
    // No estimate heuristic for cystine (nutrient 505) — only a real USDA
    // measurement counts, so this stays null (excluded, not guessed) far
    // more often than methionine does.
    const hasCys = n.cystine !== null && n.cystine !== undefined;
    const cys = hasCys ? n.cystine * scale : null;
    const before = totalMet();

    const delta = {
      grams,
      cal: n.energy !== null ? n.energy * scale : 0,
      protein: n.protein !== null ? n.protein * scale : 0,
      fat: n.fat !== null ? n.fat * scale : 0,
      carbs: n.carbs !== null ? n.carbs * scale : 0,
      met: met !== null ? met : 0,
      cys: cys !== null ? cys : 0
    };

    const existing = log.find(i => i.name === food.description && i.metEstimated === metEstimated);
    if (existing) {
      existing.grams = (existing.grams || 0) + delta.grams;
      existing.cal = (existing.cal || 0) + delta.cal;
      existing.protein = (existing.protein || 0) + delta.protein;
      existing.fat = (existing.fat || 0) + delta.fat;
      existing.carbs = (existing.carbs || 0) + delta.carbs;
      existing.met = (existing.met === null && met === null) ? null : (existing.met || 0) + delta.met;
      existing.cys = (existing.cys === null && cys === null) ? null : (existing.cys || 0) + delta.cys;
      lastAction = { id: existing.id, delta, wasNew: false };
    } else {
      const item = {
        id: newId('item'),
        name: food.description,
        grams,
        cal: n.energy !== null ? n.energy * scale : null,
        protein: n.protein !== null ? n.protein * scale : null,
        fat: n.fat !== null ? n.fat * scale : null,
        carbs: n.carbs !== null ? n.carbs * scale : null,
        met,
        metEstimated,
        cys,
        fullNutrients: []
      };
      // setLog (not log.push) so the very first add to a freshly-browsed
      // day actually attaches its array into logByDay — until now, log
      // may just be the disposable [] fallback from goToDay, and pushing
      // onto it directly would silently lose the item on save.
      setLog(log.concat(item));
      lastAction = { id: item.id, delta: null, wasNew: true };
    }
    saveLog();
    renderAll();

    const after = totalMet();
    const status = statusFor(after);
    showToast(`Added ${fmt(after - before)} mg. New total: ${fmt(after)} mg. ${statusLabel(status)}.`, status);
  }

  function undoLast() {
    if (!log.length) return;
    if (!lastAction) {
      const arr = log.slice();
      const removed = arr.pop();
      setLog(arr);
      saveLog();
      renderAll();
      if (removed) showToast(`Removed ${removed.name}.`, null);
      return;
    }
    const { id, delta, wasNew } = lastAction;
    const item = log.find(i => i.id === id);
    lastAction = null;
    if (!item) { renderAll(); return; }
    const name = item.name;
    if (wasNew) {
      setLog(log.filter(i => i.id !== id));
    } else {
      item.grams -= delta.grams;
      item.cal -= delta.cal;
      item.protein -= delta.protein;
      item.fat -= delta.fat;
      item.carbs -= delta.carbs;
      if (item.met !== null) item.met -= delta.met;
      if (item.cys !== null) item.cys -= delta.cys;
      if (item.grams <= 0) setLog(log.filter(i => i.id !== id));
    }
    saveLog();
    renderAll();
    showToast(`Undid last add to ${name}.`, null);
  }

  function removeItem(id) {
    setLog(log.filter(i => i.id !== id));
    if (lastAction && lastAction.id === id) lastAction = null;
    saveLog();
    renderAll();
  }

  // ── Portion picker: shared between quick-add tiles and search cards ──
  // Deliberately two steps (pick a portion, then a separate explicit Add)
  // rather than committing on the first tap — a chip tap alone should
  // never log food, since an accidental tap logging a meal is a worse
  // failure mode here than one extra tap.
  const PORTION_PRESETS = [50, 100, 150, 200];
  function buildPortionPicker(food, onAdded) {
    const wrap = document.createElement('div');
    wrap.className = 'portionChips';
    let selected = 100;

    const chipEls = PORTION_PRESETS.map(g => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'chip' + (g === 100 ? ' active' : '');
      c.textContent = g + 'g';
      c.addEventListener('click', () => {
        selected = g;
        chipEls.forEach(el => el.classList.remove('active'));
        c.classList.add('active');
        customInput.value = '';
      });
      wrap.appendChild(c);
      return c;
    });

    const customInput = document.createElement('input');
    customInput.type = 'number';
    customInput.min = '1';
    customInput.className = 'chipCustomInput';
    customInput.placeholder = 'Custom g';
    customInput.addEventListener('input', () => {
      if (customInput.value) chipEls.forEach(el => el.classList.remove('active'));
    });
    wrap.appendChild(customInput);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'bigBtn compact chipAddBtn';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
      const custom = parseFloat(customInput.value);
      const grams = custom > 0 ? custom : selected;
      addFoodToLog(food, grams);
      if (onAdded) onAdded();
    });
    wrap.appendChild(addBtn);

    return wrap;
  }

  // ── Result ranking: prefer a record whose description actually backs
  // up the query's words (esp. a prep state like "cooked"/"raw"/"baked")
  // before falling back to data-type quality. Ranking by data type alone
  // could silently swap "White rice, cooked" for a raw entry just
  // because it happened to be the top Foundation-tier hit for the same
  // search text — this is what actually prevents that, not a badge.
  //
  // Plain word-overlap alone isn't enough, though: "apple" vs USDA's
  // "Apples, raw, without skin" scores zero on an exact string match
  // (singular vs plural), while "Apple, candied" — a different food —
  // matches exactly and wins outright. And "Broccoli raab, cooked" ties
  // plain "Broccoli, cooked, boiled, drained" on overlap alone, since
  // overlap never penalizes an extra qualifier the query didn't ask for.
  // A crude trailing-"s" normalization plus an explicit penalty for
  // known "this is actually a different food" qualifiers fixes both
  // without a real stemmer. ──
  const STOPWORDS = new Set(['and', 'the', 'with', 'in', 'of', 'or']);
  const OFF_TARGET_WORDS = [
    'raab', 'candied', 'juice', 'jam', 'jelly', 'syrup', 'pickled',
    'dried', 'cider', 'sauce', 'puree', 'smoothie', 'chips', 'pie', 'cake',
    // "Baked potato" and "Sweet potato, baked" would otherwise tie on
    // plain word overlap ("potato"/"baked" both present in either) — but
    // they're different plants, so a plain potato search shouldn't
    // silently resolve to sweet potato (or vice versa).
    'sweet'
  ];
  function normalizeWord(w) {
    return w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
  }
  function significantWords(text) {
    return (text || '').toLowerCase().replace(/[(),]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
      .map(normalizeWord);
  }
  function matchScore(queryWords, description) {
    const descWords = new Set(significantWords(description));
    return queryWords.reduce((hits, w) => hits + (descWords.has(w) ? 1 : 0), 0);
  }
  // Penalize (rather than exclude) an off-target qualifier so it can
  // still show up in manual search results, just not win the auto-pick
  // — unless the patient actually typed that word themselves.
  function offTargetPenalty(queryWords, description) {
    const d = (description || '').toLowerCase();
    return OFF_TARGET_WORDS.reduce((penalty, w) =>
      penalty + (d.includes(w) && !queryWords.includes(normalizeWord(w)) ? 5 : 0), 0);
  }
  function dataTypeRank(dataType) {
    if (dataType === 'Foundation') return 0;
    if (dataType === 'SR Legacy') return 1;
    if (dataType === 'Survey (FNDDS)') return 2;
    return 3;
  }
  function rankFoodResults(query, results) {
    const queryWords = significantWords(query);
    return results
      .map(f => ({
        f,
        score: matchScore(queryWords, f.description) - offTargetPenalty(queryWords, f.description),
        dt: dataTypeRank(f.dataType)
      }))
      .sort((a, b) => (b.score - a.score) || (a.dt - b.dt))
      .map(x => x.f);
  }

  // ── Quick add: resolve a plain food name to a real USDA record once,
  // then cache it so repeat taps don't need the network. ──
  async function resolveFood(name) {
    const key = name.trim().toLowerCase();
    if (quickAddCache[key]) return quickAddCache[key];
    const results = await window.USDA.searchFoods(name, 10);
    if (!results.length) return null;
    const best = rankFoodResults(name, results)[0];
    quickAddCache[key] = best;
    saveQuickAddCache();
    return best;
  }

  // Shown after a quick-add name resolves, so a mismatch (e.g. "White
  // rice, cooked" silently resolving to a raw entry) is visible and
  // fixable before it's ever added, not discovered later from a wrong
  // number. Never commits anything by itself.
  function buildMatchNote(originalName, food, onSearchInstead) {
    const note = document.createElement('div');
    note.className = 'quickMatchNote';
    note.appendChild(document.createTextNode('Matched: '));
    const strong = document.createElement('strong');
    strong.textContent = food.description;
    note.appendChild(strong);
    const notThis = document.createElement('button');
    notThis.type = 'button';
    notThis.className = 'linkBtn inline';
    notThis.textContent = 'Not this? Search instead';
    notThis.addEventListener('click', onSearchInstead);
    note.appendChild(notThis);
    return note;
  }

  // Shared by Quick Add and the High-Protein/Low-Methionine picks — both
  // are just a curated list of plain food names that resolve to a real
  // USDA record through the exact same path (and the exact same
  // mismatch-catching match note) as everything else in the app.
  function renderFoodShortcutGrid(gridId, foodNames) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    foodNames.forEach(name => {
      const tile = document.createElement('div');
      tile.className = 'quickTile';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quickBtn';
      btn.textContent = name;
      let resolvedFood = null;

      btn.addEventListener('click', async () => {
        const existingPicker = tile.querySelector('.portionChips');
        if (existingPicker) {
          existingPicker.remove();
          const existingNote = tile.querySelector('.quickMatchNote');
          if (existingNote) existingNote.remove();
          return;
        }

        if (!resolvedFood) {
          btn.disabled = true;
          btn.innerHTML = name + '<span class="qLoading">Finding…</span>';
          try {
            resolvedFood = await resolveFood(name);
          } catch (e) {
            resolvedFood = null;
          }
          btn.disabled = false;
          btn.textContent = name;
        }
        if (!resolvedFood) {
          showToast(`Couldn't find "${name}" — try Search instead.`, 'over');
          return;
        }
        const cleanup = () => {
          const picker = tile.querySelector('.portionChips');
          if (picker) picker.remove();
          const note = tile.querySelector('.quickMatchNote');
          if (note) note.remove();
        };
        tile.appendChild(buildMatchNote(name, resolvedFood, () => {
          cleanup();
          const input = document.getElementById('searchInput');
          input.value = name;
          runSearch();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }));
        tile.appendChild(buildPortionPicker(resolvedFood, cleanup));
      });

      tile.appendChild(btn);
      grid.appendChild(tile);
    });
  }
  function renderQuickAdd() {
    renderFoodShortcutGrid('quickGrid', quickAddFoods);
  }
  function renderProteinPicks() {
    renderFoodShortcutGrid('proteinPicksGrid', PROTEIN_LOW_MET_PICKS);
  }

  // ── Search (photo cards) ──
  async function searchBarcodeVariants(code) {
    const digits = code.replace(/\D/g, '');
    const candidates = [digits];
    if (digits.length === 12) candidates.push('0' + digits);
    if (digits.length === 13 && digits[0] === '0') candidates.push(digits.slice(1));
    for (const candidate of candidates) {
      if (!candidate) continue;
      const results = await window.USDA.searchFoods(candidate, 15);
      if (results.length) return results;
    }
    return [];
  }

  function buildSearchResultCard(food) {
    const n = food.nutrients;
    const isWholeFood = food.dataType === 'Foundation' || food.dataType === 'SR Legacy';
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const estMet = hasMet ? null : estimateMethionine(n.protein, food.description);
    const met100 = hasMet ? n.methionine : estMet;

    const photoUrl = photoFor(food.description) || placeholderPhoto(food.description);
    const fallbackUrl = placeholderPhoto(food.description);

    const card = document.createElement('div');
    card.className = 'foodCard';
    card.innerHTML = `
      <img class="foodCardImg" src="${photoUrl}" alt="${food.description}" loading="lazy"
           onerror="this.onerror=null;this.src='${fallbackUrl}';">
      <div class="foodCardTop">
        <span class="cardIcon">${iconFor(food.description)}</span>
        <div class="foodCardTitleWrap">
          <span class="resultName">${food.description}</span>
          ${food.brandOwner ? '<span class="resultMeta">' + food.brandOwner + '</span>' : ''}
        </div>
        <span class="dtBadge ${isWholeFood ? 'good' : ''}">${food.dataType || 'unknown'}</span>
      </div>
      <div class="metaBadgeRow">
        ${hasMet
          ? '<span class="metaBadge measured">🧪 Lab Measured</span>'
          : (met100 !== null ? '<span class="metaBadge estimated">⚠️ Estimate — rough guess, not measured</span>' : '<span class="metaBadge unknown">No methionine data</span>')}
        ${food.dataType === 'OpenFoodFacts' ? '<span class="metaBadge off">Open Food Facts</span>' : ''}
      </div>
      <div class="cardMetRow">
        <span class="cardMetValue">${met100 !== null ? (hasMet ? '' : '~') + fmt(met100) + ' mg' : 'not available'}</span>
        <span class="cardMetLabel">methionine per 100g</span>
      </div>
    `;
    card.appendChild(buildPortionPicker(food));
    return card;
  }

  async function runSearch(fromBarcode) {
    const raw = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('resultsList');
    if (!raw) { status.textContent = 'Type a food to search.'; return; }
    status.textContent = 'Searching…';
    list.innerHTML = '';
    try {
      let results;
      let usedFallback = false;
      if (fromBarcode) {
        results = await searchBarcodeVariants(raw);
        if (!results.length && window.OpenFoodFacts) {
          status.textContent = 'Not in USDA — checking Open Food Facts…';
          try {
            const offFood = await window.OpenFoodFacts.lookupBarcode(raw);
            if (offFood) { results = [offFood]; usedFallback = true; }
          } catch (e) {}
        }
      } else {
        // Fetch a few extra past the 8 we show, then rerank by how well
        // each description actually matches the typed words (not just
        // USDA's own relevance order) before trimming — otherwise a
        // "cooked" search could show a raw entry above the cooked one.
        results = rankFoodResults(raw, await window.USDA.searchFoods(raw, 12));
      }

      if (!results.length) {
        status.textContent = fromBarcode
          ? `Barcode ${raw} isn't in USDA or Open Food Facts — try Search by name instead.`
          : 'No results — try a different word.';
        return;
      }
      status.textContent = `${results.length} result${results.length === 1 ? '' : 's'}${usedFallback ? ' (from Open Food Facts)' : ''}`;
      results.slice(0, 8).forEach(food => list.appendChild(buildSearchResultCard(food)));
    } catch (e) {
      status.textContent = 'Could not reach the food database. Check your connection.';
    }
  }

  // ── Selected day's item list ──
  function renderItemList() {
    const container = document.getElementById('itemList');
    container.innerHTML = '';
    if (!log.length) {
      container.innerHTML = `<div class="emptyNote">Nothing logged ${dayPhrase()}.</div>`;
      return;
    }
    log.forEach(item => {
      const row = document.createElement('div');
      row.className = 'itemRow';
      const metText = item.met === null ? '?' : (item.metEstimated ? '<span class="metEstimated">⚠️ ~' + fmt(item.met) + '</span>' : fmt(item.met));
      const macroBits = [];
      if (item.cal !== null && item.cal !== undefined) macroBits.push(fmt(item.cal) + ' kcal');
      if (item.protein !== null && item.protein !== undefined) macroBits.push(fmt(item.protein) + 'g protein');
      row.innerHTML = `
        <span>
          <span class="iName">${item.name}</span><br>
          <span class="iMeta">${item.grams != null ? fmt(item.grams) + ' g · ' : ''}${metText} mg methionine${macroBits.length ? ' · ' + macroBits.join(' · ') : ''}</span>
        </span>
        <button type="button" class="rmBtn" title="Remove">×</button>
      `;
      row.querySelector('.rmBtn').addEventListener('click', () => removeItem(item.id));
      container.appendChild(row);
    });
  }

  // Dose is stored as structured {doseQty, doseUnit} now, not free text —
  // easier to read back cleanly in exports. Older entries saved before
  // this only have `amount` (free text like "250 units / 1 capsule");
  // this falls back to that so nothing already logged looks blank.
  // There is deliberately no calculation anywhere that uses this number
  // — Hoffman himself describes methioninase timing/dosing as guidance,
  // not a hard science, so this app records it rather than computing
  // anything from it.
  function doseText(entry) {
    if (!entry) return '';
    if (entry.doseQty) return `${fmt(entry.doseQty)} ${entry.doseUnit || ''}`.trim();
    return entry.amount || '';
  }

  // ── Methioninase (tracked per viewDate, same as the food log) ──
  function renderMethio() {
    const all = loadMethio();
    const entry = all[viewDate];
    const statusEl = document.getElementById('methioStatus');
    const buttonsRow = document.getElementById('methioButtons');
    const editLink = document.getElementById('btnMethioEdit');

    if (!entry) {
      statusEl.hidden = true;
      buttonsRow.hidden = false;
      editLink.hidden = true;
    } else {
      statusEl.hidden = false;
      buttonsRow.hidden = true;
      editLink.hidden = false;
      const mealNote = entry.meal ? ` (${entry.meal})` : '';
      const dose = doseText(entry);
      if (entry.took) {
        statusEl.textContent = `✅ Took methioninase ${dayPhrase()}` + (entry.time ? ` at ${entry.time}` : '') + mealNote + (dose ? ` — ${dose}` : '');
        statusEl.className = 'methioStatus logged-yes';
      } else {
        statusEl.textContent = `❌ Not taken ${dayPhrase()}`;
        statusEl.className = 'methioStatus logged-no';
      }
    }
    document.getElementById('methioTime').value = entry ? (entry.time || '') : '';
    document.getElementById('methioDoseQty').value = entry && entry.doseQty ? entry.doseQty : '';
    document.getElementById('methioDoseUnit').value = entry && entry.doseUnit ? entry.doseUnit : 'capsules';
    document.getElementById('methioMeal').value = entry ? (entry.meal || '') : '';
    document.getElementById('methioNotes').value = entry ? (entry.notes || '') : '';
    document.getElementById('methioDetails').hidden = true;
  }

  function setMethio(took) {
    const all = loadMethio();
    const existing = all[viewDate] || {};
    all[viewDate] = Object.assign({}, existing, { took, loggedAt: Date.now() });
    saveMethio(all);
    renderMethio();
    if (took) document.getElementById('methioDetails').hidden = false;
  }

  function saveMethioDetails(e) {
    if (e) e.preventDefault();
    const all = loadMethio();
    const existing = all[viewDate] || { took: true };
    const doseQty = parseFloat(document.getElementById('methioDoseQty').value);
    all[viewDate] = Object.assign({}, existing, {
      time: document.getElementById('methioTime').value.trim(),
      doseQty: isNaN(doseQty) ? null : doseQty,
      doseUnit: document.getElementById('methioDoseUnit').value,
      meal: document.getElementById('methioMeal').value,
      notes: document.getElementById('methioNotes').value.trim(),
      loggedAt: Date.now()
    });
    saveMethio(all);
    renderMethio();
    showToast('Saved.', null);
  }

  // ── Read total aloud ──
  function readTotalAloud() {
    if (!('speechSynthesis' in window)) { showToast('Voice reading is not supported on this device.', 'over'); return; }
    const total = totalMet();
    const hasCap = dailyCap !== null && dailyCap !== undefined;
    const text = hasCap
      ? `${fmt(total)} milligrams used ${dayPhrase()}, out of ${fmt(dailyCap)}. ${fmt(Math.max(0, dailyCap - total))} milligrams still safe to eat. Status: ${statusLabel(statusFor(total))}.`
      : `${fmt(total)} milligrams used ${dayPhrase()}. You haven't set a daily limit yet.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // ── Share ── One day's full nutrition, not just methionine — a
  // dietitian assessing cachexia/caloric-adequacy risk needs calories and
  // protein just as much as the methionine number, and both were already
  // being computed and stored per item without ever reaching this export.
  function buildSummaryText() {
    const total = totalMet();
    const sulfurTotal = total + totalCys();
    const lines = [];
    lines.push(`Methionine log — ${viewDate}${viewDate === todayISO() ? ' (Today)' : ''}`);
    lines.push(`Methionine: ${fmt(total)} mg / ceiling ${capText()} (${statusLabel(statusFor(total))})`);
    lines.push(`Total sulfur amino acids (Met + Cys): ${fmt(sulfurTotal)} mg` + (hasAnyCysMissing() ? ' (incomplete — cystine not measured for every item)' : ''));
    lines.push(`Calories: ${fmt(totalField('cal'))} kcal · Protein: ${fmt(totalField('protein'))} g · Fat: ${fmt(totalField('fat'))} g · Carbs: ${fmt(totalField('carbs'))} g`);
    lines.push('');
    if (log.length) {
      log.forEach(item => {
        const metText = item.met === null ? '?' : (item.metEstimated ? '~' + fmt(item.met) + ' (unverified guess, not measured)' : fmt(item.met));
        const macroBits = [];
        if (item.cal !== null && item.cal !== undefined) macroBits.push(fmt(item.cal) + ' kcal');
        if (item.protein !== null && item.protein !== undefined) macroBits.push(fmt(item.protein) + 'g protein');
        lines.push(`- ${item.name} (${item.grams != null ? fmt(item.grams) + 'g' : 'n/a'}): ${metText} mg methionine${macroBits.length ? ', ' + macroBits.join(', ') : ''}`);
      });
    } else {
      lines.push('(nothing logged)');
    }
    const all = loadMethio();
    const entry = all[viewDate];
    lines.push('');
    lines.push('Methioninase: ' + (entry
      ? (entry.took ? 'Yes' + (entry.time ? ` at ${entry.time}` : '') + (entry.meal ? ` (${entry.meal})` : '') + (doseText(entry) ? ` — ${doseText(entry)}` : '') : 'No')
      : 'Not logged'));
    if (entry && entry.notes) lines.push('Notes: ' + entry.notes);
    return lines.join('\n');
  }

  // ── Multi-day clinical compliance summary: every day that has either
  // food or methioninase logged, so a patient can actually hand a
  // longitudinal report to a dietitian instead of one day at a time. ──
  function allLoggedDates() {
    const methio = loadMethio();
    // Only days with an actual item or methioninase entry count — a day
    // that was merely browsed through (e.g. tapping ◀ a few times
    // looking for the right day) must not appear in the compliance
    // summary as a hollow "0 mg, Not logged" day and drag down the
    // average.
    const daysWithFood = Object.keys(logByDay).filter(d => logByDay[d] && logByDay[d].length > 0);
    return Array.from(new Set([...daysWithFood, ...Object.keys(methio)])).sort();
  }
  function buildComplianceSummaryText() {
    const dates = allLoggedDates();
    const methio = loadMethio();
    const lines = [];
    lines.push('CLINICAL COMPLIANCE SUMMARY — Methionine Restriction Log');
    lines.push(`Generated ${new Date().toLocaleString()}`);
    lines.push(`Daily methionine ceiling: ${capText()}`);
    lines.push('');
    if (!dates.length) {
      lines.push('(no days logged yet)');
      return lines.join('\n');
    }
    lines.push('Date         Methionine    Status               Calories    Protein   Methioninase');
    let sumMet = 0, withinLimitDays = 0, tookDays = 0;
    dates.forEach(d => {
      const items = logByDay[d] || [];
      const met = items.reduce((s, i) => s + (i.met || 0), 0);
      const cal = items.reduce((s, i) => s + (i.cal || 0), 0);
      const protein = items.reduce((s, i) => s + (i.protein || 0), 0);
      const status = statusFor(met);
      const entry = methio[d];
      sumMet += met;
      if (status !== 'over') withinLimitDays++;
      if (entry && entry.took) tookDays++;
      const methioCell = entry ? (entry.took ? 'Yes' + (entry.time ? ` @${entry.time}` : '') : 'No') : 'Not logged';
      lines.push(
        `${d}   ${(fmt(met) + ' mg').padStart(10)}   ${statusLabel(status).padEnd(20)} ${(fmt(cal) + ' kcal').padStart(10)}  ${(fmt(protein) + 'g').padStart(7)}   ${methioCell}`
      );
    });
    lines.push('');
    lines.push(`Average methionine: ${fmt(sumMet / dates.length)} mg/day across ${dates.length} day(s) logged`);
    lines.push(`Days within limit: ${withinLimitDays} / ${dates.length}`);
    lines.push(`Methioninase taken: ${tookDays} / ${dates.length} day(s) logged`);
    return lines.join('\n');
  }

  async function copySummary() {
    const text = buildSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Summary copied.', null);
    } catch (e) {
      alert(text);
    }
  }

  async function copyComplianceSummary() {
    const text = buildComplianceSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Compliance summary copied.', null);
    } catch (e) {
      alert(text);
    }
  }

  // ── Backup & Transfer save file — separate on purpose from Copy
  // Summary / Compliance Summary above: those are one-way, human-
  // readable text for a clinician. This is machine-readable JSON meant
  // to round-trip — moving a patient's full state to a new device, or
  // letting whoever manages the data on their own device hand back an
  // updated file the patient can import and actually see. ──
  const SAVE_FILE_VERSION = 1;
  function buildSaveFileData() {
    return {
      saveFileVersion: SAVE_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      dailyCap,
      proteinGoal,
      calorieGoal,
      quickAddFoods,
      logByDay,
      methio: loadMethio()
    };
  }
  function exportSaveFile() {
    const data = buildSaveFileData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `methionine-tracker-save-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Save file downloaded.', null);
  }
  function applyImportedData(data) {
    if (!data || typeof data !== 'object') {
      showToast('That file isn\'t a valid save file.', 'over');
      return;
    }
    logByDay = (data.logByDay && typeof data.logByDay === 'object') ? data.logByDay : {};
    saveLog();
    saveMethio((data.methio && typeof data.methio === 'object') ? data.methio : {});
    dailyCap = (typeof data.dailyCap === 'number' && data.dailyCap > 0) ? data.dailyCap : null;
    saveCap();
    proteinGoal = (typeof data.proteinGoal === 'number' && data.proteinGoal > 0) ? data.proteinGoal : null;
    saveProteinGoal();
    calorieGoal = (typeof data.calorieGoal === 'number' && data.calorieGoal > 0) ? data.calorieGoal : null;
    saveCalorieGoal();
    quickAddFoods = (Array.isArray(data.quickAddFoods) && data.quickAddFoods.length) ? data.quickAddFoods : DEFAULT_QUICKADD.slice();
    saveQuickAdd();

    viewDate = todayISO();
    log = logByDay[viewDate] || (logByDay[viewDate] = []);
    lastAction = null;

    renderAll();
    renderDayBar();
    renderQuickAdd();
    renderProteinPicks();
    renderMethio();
    showToast('Save file imported.', null);
  }
  function importSaveFile(file) {
    if (!file) return;
    if (!confirm('Importing will replace everything currently saved on this device — every day\'s log, methioninase records, your daily limit, and goals — with what\'s in this file. Continue?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) {
        showToast('That file isn\'t valid JSON — nothing was changed.', 'over');
        return;
      }
      applyImportedData(data);
    };
    reader.onerror = () => showToast('Could not read that file.', 'over');
    reader.readAsText(file);
  }

  async function shareSummary() {
    const text = buildSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Methionine Log — ' + viewDate, text });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // user closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Sharing isn\'t available in this browser — copied instead. Paste it into Keep.', null);
    } catch (e2) {
      alert(text);
    }
  }

  // ── Feedback ──
  function sendFeedback() {
    const subject = encodeURIComponent('Methionine tracker feedback — Unified (Experimental)');
    const body = encodeURIComponent(
      `Version: Unified (Experimental)\nLink: ${window.location.href}\n\nWhat worked:\n\n\nWhat didn't:\n\n`
    );
    window.location.href = `mailto:nutritiontracker@feisttech.com?subject=${subject}&body=${body}`;
  }

  // ── Tutorial walkthrough ──
  let tutorialStep = 0;
  function tutorialSteps() {
    const capLine = CONFIG.lockCap
      ? ' Your daily limit is set by your care team.'
      : ' You set this number yourself when you first opened the tracker — tap "Change daily limit" if it ever needs to change.';
    return [
      { icon: '🔢', title: 'Your Daily Total', text: `This big number shows how much methionine you've eaten today. Green means safe, yellow means getting close, red means you're over your limit.${capLine} This app never guesses that number for you — it has to come from your care team.` },
      { icon: '🍽️', title: 'Quick Add', text: 'Tap any food button below to pick a portion, then tap Add.' },
      { icon: '🌱', title: 'High-Protein, Low-Methionine Picks', text: 'Right below Quick Add is a shortcut list of non-meat proteins (tofu, lentils, seitan, and the like) that tend to carry less methionine per gram of protein than meat, egg, or dairy — a fast way to reach for something that helps your protein goal without spending much of your methionine budget.' },
      { icon: '↩️', title: 'Made A Mistake?', text: 'Tap "Undo Last Add" any time to remove the food you just added.' },
      { icon: '📅', title: 'Catching Up On A Missed Day', text: 'Life happens — if you didn\'t get to log at the time, use ◀ / ▶ or pick a date to go back and catalog what you actually ate that day. Food and methioninase are tracked separately per day, so a past day is never mixed into today\'s total. A banner reminds you which day you\'re logging for.' },
      { icon: '🔍', title: "Can't Find Your Food?", text: 'Use Search to type it in, say it out loud, or scan a barcode. Each result shows a photo, whether the methionine number is lab-measured or a rough guess, and portion buttons. If a quick-add food matches the wrong item (like a raw entry for something you cooked), a "Not this? Search instead" link lets you fix it before adding.' },
      { icon: '🧪', title: 'Total Sulfur Amino Acids', text: 'Under your methionine total, a second line adds Cystine in as well (Met + Cys). Cystine intake affects how your body processes methionine, so your care team may want that combined number too.' },
      { icon: '💪', title: 'Watching For Cachexia Risk', text: 'Restricting methionine can mean under-eating overall if you\'re not careful. Tap "Set a protein/calorie goal" under your daily total to get a second pair of meters — green means you\'ve hit that day\'s protein or calorie goal, red means you\'re falling short and should flag it to your care team.' },
      { icon: '💊', title: 'Methioninase', text: 'Tap Yes or No each day to keep a record of it, with the time, meal, and a dose quantity if you want. A note in that section shares Dr. Hoffman\'s own guidance on timing — but the app doesn\'t calculate anything from the dose, since he\'s said himself this isn\'t an exact science.' },
      { icon: '📤', title: 'Sharing Your Log', text: 'Use Send Feedback, Share, or Print any time to send today\'s log to your care team. "Copy Compliance Summary" builds a multi-day report across every day you\'ve logged.' }
    ];
  }
  function renderTutorialStep() {
    const steps = tutorialSteps();
    const step = steps[tutorialStep];
    document.getElementById('tutorialProgress').textContent = `Step ${tutorialStep + 1} of ${steps.length}`;
    document.getElementById('tutorialIcon').textContent = step.icon;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialText').textContent = step.text;

    const dots = document.getElementById('tutorialDots');
    dots.innerHTML = '';
    steps.forEach((s, i) => {
      const dot = document.createElement('span');
      dot.className = 'tutorialDot' + (i === tutorialStep ? ' active' : '');
      dots.appendChild(dot);
    });

    document.getElementById('btnTutorialBack').hidden = tutorialStep === 0;
    document.getElementById('btnTutorialNext').textContent = tutorialStep === steps.length - 1 ? 'Done' : 'Next';
  }
  function openTutorial() {
    tutorialStep = 0;
    renderTutorialStep();
    document.getElementById('tutorialOverlay').hidden = false;
  }
  function closeTutorial() {
    document.getElementById('tutorialOverlay').hidden = true;
  }
  function tutorialNext() {
    if (tutorialStep >= tutorialSteps().length - 1) { closeTutorial(); return; }
    tutorialStep++;
    renderTutorialStep();
  }
  function tutorialBack() {
    if (tutorialStep === 0) return;
    tutorialStep--;
    renderTutorialStep();
  }

  // ── Cap editing ──
  function openCapEdit() {
    document.getElementById('capEditInput').value = dailyCap === null ? '' : dailyCap;
    document.getElementById('capEditRow').hidden = true;
    document.getElementById('capEditFormWrap').hidden = false;
    document.getElementById('capEditInput').focus();
  }
  function closeCapEdit() {
    document.getElementById('capEditFormWrap').hidden = true;
    document.getElementById('capEditRow').hidden = false;
  }
  function saveCapEdit(e) {
    if (e) e.preventDefault();
    const num = parseFloat(document.getElementById('capEditInput').value);
    if (!isNaN(num) && num > 0) { dailyCap = num; saveCap(); renderAll(); }
    closeCapEdit();
  }

  // ── First-run onboarding: the methionine ceiling is a number that has
  // to come from the patient's own care team, so it starts blank (see
  // `dailyCap` above) and this prompts for it once, on first load, only
  // when nothing's been set and no care team has locked one in already. ──
  function maybeShowOnboarding() {
    if (CONFIG.lockCap) return; // care team's value is already authoritative
    if (dailyCap !== null) return; // already set on a previous visit
    document.getElementById('onboardCapInput').value = '';
    document.getElementById('onboardWeightCalc').hidden = true;
    document.getElementById('onboardOverlay').hidden = false;
    document.getElementById('onboardCapInput').focus();
  }
  function saveOnboardCap() {
    const num = parseFloat(document.getElementById('onboardCapInput').value);
    if (!isNaN(num) && num > 0) { dailyCap = num; saveCap(); renderAll(); }
    document.getElementById('onboardOverlay').hidden = true;
  }
  const LB_PER_KG = 2.20462262185;
  // Dr. Hoffman has described setting the ceiling relative to body
  // weight rather than a flat number — this does the arithmetic for
  // whatever mg/kg target the patient's own care team gave them. It
  // never supplies that target itself; there's no verified published
  // coefficient this app could safely default to, and guessing one
  // would be exactly the kind of fabricated-precision this tracker
  // otherwise goes out of its way to avoid.
  function calcOnboardFromWeight() {
    const weightRaw = parseFloat(document.getElementById('onboardWeight').value);
    const unit = document.getElementById('onboardWeightUnit').value;
    const mgPerKg = parseFloat(document.getElementById('onboardMgPerKg').value);
    if (isNaN(weightRaw) || weightRaw <= 0 || isNaN(mgPerKg) || mgPerKg <= 0) {
      showToast('Enter both a body weight and the mg/kg target your care team gave you.', 'over');
      return;
    }
    const weightKg = unit === 'lb' ? weightRaw / LB_PER_KG : weightRaw;
    document.getElementById('onboardCapInput').value = Math.round(weightKg * mgPerKg * 10) / 10;
  }

  // ── Protein/calorie goal editing — same shape as cap editing, but for
  // a floor to watch rather than a ceiling to enforce. Either field can
  // be left blank; only the ones actually filled in get a meter. ──
  function openGoalsEdit() {
    document.getElementById('proteinGoalInput').value = proteinGoal || '';
    document.getElementById('calorieGoalInput').value = calorieGoal || '';
    document.getElementById('btnSetGoals').hidden = true;
    document.getElementById('btnEditGoals').hidden = true;
    document.getElementById('goalsEditFormWrap').hidden = false;
    document.getElementById('proteinGoalInput').focus();
  }
  function closeGoalsEdit() {
    document.getElementById('goalsEditFormWrap').hidden = true;
    renderAdequacy();
  }
  function saveGoalsEdit(e) {
    if (e) e.preventDefault();
    const pNum = parseFloat(document.getElementById('proteinGoalInput').value);
    proteinGoal = (!isNaN(pNum) && pNum > 0) ? pNum : null;
    saveProteinGoal();
    const cNum = parseFloat(document.getElementById('calorieGoalInput').value);
    calorieGoal = (!isNaN(cNum) && cNum > 0) ? cNum : null;
    saveCalorieGoal();
    renderAll();
    closeGoalsEdit();
  }

  // ── Quick-add editing: one row per food, edit/remove in place ──
  function buildEditFoodRow(name) {
    const row = document.createElement('div');
    row.className = 'editFoodRow';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'editFoodInput';
    input.value = name;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rmBtn';
    rm.title = 'Remove';
    rm.textContent = '×';
    rm.addEventListener('click', () => row.remove());
    row.appendChild(input);
    row.appendChild(rm);
    return row;
  }
  function openEditQuickAdd() {
    const list = document.getElementById('editFoodList');
    list.innerHTML = '';
    quickAddFoods.forEach(name => list.appendChild(buildEditFoodRow(name)));
    document.getElementById('editOverlay').hidden = false;
  }
  function saveEditQuickAdd() {
    const names = Array.from(document.querySelectorAll('#editFoodList .editFoodInput'))
      .map(i => i.value.trim()).filter(Boolean);
    if (names.length) { quickAddFoods = names; saveQuickAdd(); renderQuickAdd(); }
    document.getElementById('editOverlay').hidden = true;
  }

  // ── Voice input ──
  function wireVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById('btnMic');
    if (!micBtn) return;
    if (!SpeechRecognition) { micBtn.disabled = true; micBtn.title = 'Voice input not supported in this browser'; return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    micBtn.addEventListener('click', () => {
      recognition.start();
      micBtn.classList.add('listening');
    });
    recognition.onresult = e => {
      document.getElementById('searchInput').value = e.results[0][0].transcript;
      runSearch();
    };
    recognition.onend = () => micBtn.classList.remove('listening');
    recognition.onerror = () => micBtn.classList.remove('listening');
  }

  // ── Barcode scanning ──
  function wireScan() {
    const scanBtn = document.getElementById('btnScan');
    const reader = document.getElementById('scanReader');
    if (!scanBtn || !reader) return;
    if (typeof Html5Qrcode === 'undefined') { scanBtn.disabled = true; scanBtn.title = 'Barcode scanning unavailable offline'; return; }
    scanBtn.addEventListener('click', () => {
      if (!reader.hidden) {
        if (html5Qrcode) html5Qrcode.stop().catch(() => {});
        reader.hidden = true;
        return;
      }
      reader.hidden = false;
      const scanConfig = (typeof Html5QrcodeSupportedFormats !== 'undefined') ? {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        useBarCodeDetectorIfSupported: true,
        verbose: false
      } : undefined;
      html5Qrcode = new Html5Qrcode('scanReader', scanConfig);
      html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        decodedText => {
          html5Qrcode.stop().catch(() => {});
          reader.hidden = true;
          document.getElementById('searchInput').value = decodedText;
          runSearch(true);
        },
        () => {}
      ).catch(() => {
        reader.hidden = true;
        alert('Could not access the camera. Barcode scanning needs camera permission over HTTPS.');
      });
    });
  }

  function renderAll() {
    renderTotal();
    renderItemList();
  }

  function init() {
    checkStoragePersistence();
    loadState();
    renderAll();
    renderDayBar();
    renderQuickAdd();
    renderProteinPicks();
    renderMethio();
    wireVoice();
    wireScan();

    document.getElementById('btnPrevDay').addEventListener('click', () => switchDay(-1));
    document.getElementById('btnNextDay').addEventListener('click', () => switchDay(1));
    document.getElementById('btnJumpToday').addEventListener('click', jumpToToday);
    document.getElementById('btnLoggingForToday').addEventListener('click', jumpToToday);
    document.getElementById('dayPicker').addEventListener('change', e => {
      if (e.target.value) goToDay(e.target.value);
    });

    document.getElementById('btnUndo').addEventListener('click', undoLast);
    document.getElementById('btnReadAloud').addEventListener('click', readTotalAloud);
    if (CONFIG.lockCap) {
      document.getElementById('btnEditCap').hidden = true;
      document.getElementById('capLockedNote').hidden = false;
    } else {
      document.getElementById('btnEditCap').addEventListener('click', openCapEdit);
      document.getElementById('capEditForm').addEventListener('submit', saveCapEdit);
      document.getElementById('btnCapCancel').addEventListener('click', closeCapEdit);
    }
    document.getElementById('btnOnboardSave').addEventListener('click', saveOnboardCap);
    document.getElementById('btnOnboardSkip').addEventListener('click', () => {
      document.getElementById('onboardOverlay').hidden = true;
    });
    document.getElementById('onboardForm').addEventListener('submit', e => {
      e.preventDefault();
      saveOnboardCap();
    });
    document.getElementById('btnOnboardWeightToggle').addEventListener('click', () => {
      const calc = document.getElementById('onboardWeightCalc');
      calc.hidden = !calc.hidden;
    });
    document.getElementById('btnOnboardCalc').addEventListener('click', calcOnboardFromWeight);
    maybeShowOnboarding();

    document.getElementById('btnSetGoals').addEventListener('click', openGoalsEdit);
    document.getElementById('btnEditGoals').addEventListener('click', openGoalsEdit);
    document.getElementById('goalsEditForm').addEventListener('submit', saveGoalsEdit);
    document.getElementById('btnGoalsCancel').addEventListener('click', closeGoalsEdit);

    document.getElementById('searchForm').addEventListener('submit', e => {
      e.preventDefault();
      runSearch();
    });
    let searchDebounceTimer = null;
    document.getElementById('searchInput').addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const val = document.getElementById('searchInput').value.trim();
      if (val.length < 2) return;
      searchDebounceTimer = setTimeout(() => runSearch(), 400);
    });

    document.getElementById('btnMethioYes').addEventListener('click', () => setMethio(true));
    document.getElementById('btnMethioNo').addEventListener('click', () => setMethio(false));
    document.getElementById('btnMethioEdit').addEventListener('click', () => {
      document.getElementById('methioDetails').hidden = false;
    });
    document.getElementById('methioDetails').addEventListener('submit', saveMethioDetails);
    ['methioTime', 'methioDoseQty', 'methioDoseUnit', 'methioMeal', 'methioNotes'].forEach(id => {
      document.getElementById(id).addEventListener('focus', () => {
        setTimeout(() => {
          const btn = document.getElementById('btnMethioSave');
          if (btn) btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 300);
      });
    });

    document.getElementById('btnFeedback').addEventListener('click', sendFeedback);
    document.getElementById('btnShare').addEventListener('click', shareSummary);
    document.getElementById('btnMoreOptions').addEventListener('click', () => {
      const opts = document.getElementById('moreOptions');
      opts.hidden = !opts.hidden;
    });
    document.getElementById('btnPrint').addEventListener('click', () => window.print());
    document.getElementById('btnCopy').addEventListener('click', copySummary);
    document.getElementById('btnCopyCompliance').addEventListener('click', copyComplianceSummary);
    document.getElementById('btnExportSave').addEventListener('click', exportSaveFile);
    document.getElementById('btnImportSave').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      importSaveFile(file);
      e.target.value = ''; // allow re-importing the same filename later
    });

    document.getElementById('btnEditQuickAdd').addEventListener('click', openEditQuickAdd);
    document.getElementById('btnAddFoodRow').addEventListener('click', () => {
      const list = document.getElementById('editFoodList');
      const row = buildEditFoodRow('');
      list.appendChild(row);
      row.querySelector('input').focus();
    });
    document.getElementById('btnCancelEdit').addEventListener('click', () => { document.getElementById('editOverlay').hidden = true; });
    document.getElementById('btnSaveEdit').addEventListener('click', saveEditQuickAdd);
    document.getElementById('editOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('editOverlay')) document.getElementById('editOverlay').hidden = true;
    });

    document.getElementById('btnHelp').addEventListener('click', openTutorial);
    document.getElementById('btnTutorialNext').addEventListener('click', tutorialNext);
    document.getElementById('btnTutorialBack').addEventListener('click', tutorialBack);
    document.getElementById('btnTutorialSkip').addEventListener('click', closeTutorial);
    document.getElementById('tutorialOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('tutorialOverlay')) closeTutorial();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      document.getElementById('editOverlay').hidden = true;
      document.getElementById('tutorialOverlay').hidden = true;
    });
  }

  init();
})();
