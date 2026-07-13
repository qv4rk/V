(function () {
  'use strict';

  // A page can set window.ACCESSIBLE_CONFIG before this script loads to
  // pick a demo variant: { storagePrefix, defaultCap, lockCap }. With no
  // config (the real production page) this falls through to the exact
  // keys/defaults the app always used, so it still shares its log with
  // the detailed view untouched.
  const CONFIG = window.ACCESSIBLE_CONFIG || {};
  const KEY_PREFIX = CONFIG.storagePrefix || '';

  const LOG_KEY = KEY_PREFIX + 'feisttech_met_daily_log';
  const CAP_KEY = KEY_PREFIX + 'feisttech_met_daily_cap';
  const QUICKADD_KEY = KEY_PREFIX + 'feisttech_met_accessible_quickadd';
  const QUICKADD_CACHE_KEY = KEY_PREFIX + 'feisttech_met_accessible_quickadd_cache';
  const METHIO_KEY = KEY_PREFIX + 'feisttech_met_methioninase_log';

  // A neutral starting list, not a medical recommendation — replace this
  // with whatever the care team has actually approved via "Edit This List".
  const DEFAULT_QUICKADD = [
    'Apple', 'Banana', 'White rice, cooked', 'Broccoli, cooked',
    'Sweet potato, baked', 'Applesauce', 'Grapes', 'Carrots, cooked'
  ];

  let log = [];
  let dailyCap = CONFIG.defaultCap || 150;
  let quickAddFoods = DEFAULT_QUICKADD.slice();
  let quickAddCache = {};
  let lastAction = null; // { id, delta, wasNew } — what "Undo Last Add" should reverse
  let html5Qrcode = null;

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadState() {
    try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { log = []; }
    const cap = parseFloat(localStorage.getItem(CAP_KEY));
    if (!isNaN(cap) && cap > 0) dailyCap = cap;
    try {
      const saved = JSON.parse(localStorage.getItem(QUICKADD_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) quickAddFoods = saved;
    } catch (e) {}
    try { quickAddCache = JSON.parse(localStorage.getItem(QUICKADD_CACHE_KEY) || '{}'); } catch (e) { quickAddCache = {}; }
  }
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
  }
  function saveCap() {
    try { localStorage.setItem(CAP_KEY, String(dailyCap)); } catch (e) {}
  }
  function saveQuickAdd() {
    try { localStorage.setItem(QUICKADD_KEY, JSON.stringify(quickAddFoods)); } catch (e) {}
  }
  function saveQuickAddCache() {
    try { localStorage.setItem(QUICKADD_CACHE_KEY, JSON.stringify(quickAddCache)); } catch (e) {}
  }
  function loadMethio() {
    try { return JSON.parse(localStorage.getItem(METHIO_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMethio(all) {
    try { localStorage.setItem(METHIO_KEY, JSON.stringify(all)); } catch (e) {}
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return Math.round(n * 10) / 10;
  }
  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Same estimate model as the detailed app: when USDA has no measured
  // methionine, approximate it from protein content.
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

  function totalMet() {
    return log.reduce((sum, i) => sum + (i.met || 0), 0);
  }

  function statusFor(total) {
    if (dailyCap <= 0) return 'safe';
    const pct = total / dailyCap;
    if (pct > 1) return 'over';
    if (pct >= 0.8) return 'caution';
    return 'safe';
  }
  function statusLabel(status) {
    return status === 'safe' ? 'Safe' : (status === 'caution' ? 'Close to the limit' : 'Over the limit');
  }

  // ── Big total ──
  function renderTotal() {
    const total = totalMet();
    const status = statusFor(total);
    const remaining = Math.max(0, dailyCap - total);

    const pill = document.getElementById('statusPill');
    pill.className = 'statusPill ' + status;
    pill.textContent = status === 'safe' ? 'SAFE' : (status === 'caution' ? 'CLOSE TO LIMIT' : 'OVER LIMIT');

    const big = document.getElementById('bigTotal');
    big.className = 'bigTotal ' + status;
    big.innerHTML = fmt(total) + '<span class="bigTotalUnit"> / ' + fmt(dailyCap) + ' mg</span>';

    const pct = dailyCap > 0 ? Math.min(100, (total / dailyCap) * 100) : 0;
    const fill = document.getElementById('bigBarFill');
    fill.style.width = pct + '%';
    fill.className = 'bigBarFill' + (status !== 'safe' ? ' ' + status : '');

    document.getElementById('bigSubline').textContent =
      `${fmt(total)} mg used today · ${fmt(remaining)} mg still safe to eat`;

    document.getElementById('btnUndo').disabled = log.length === 0;
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
  // Logging the same food again merges into its existing row (grams and
  // every nutrient add up) instead of creating a second line, so the log
  // reads as "Apple — 200g" rather than two separate "Apple — 100g" rows.
  function addFoodToLog(food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const metEstimated = !hasMet;
    const metPer100 = hasMet ? n.methionine : estimateMethionine(n.protein, food.description);
    const met = metPer100 !== null ? metPer100 * scale : null;
    const before = totalMet();

    const delta = {
      grams,
      cal: n.energy !== null ? n.energy * scale : 0,
      protein: n.protein !== null ? n.protein * scale : 0,
      fat: n.fat !== null ? n.fat * scale : 0,
      carbs: n.carbs !== null ? n.carbs * scale : 0,
      met: met !== null ? met : 0
    };

    const existing = log.find(i => i.name === food.description && i.metEstimated === metEstimated);
    if (existing) {
      existing.grams = (existing.grams || 0) + delta.grams;
      existing.cal = (existing.cal || 0) + delta.cal;
      existing.protein = (existing.protein || 0) + delta.protein;
      existing.fat = (existing.fat || 0) + delta.fat;
      existing.carbs = (existing.carbs || 0) + delta.carbs;
      existing.met = (existing.met === null && met === null) ? null : (existing.met || 0) + delta.met;
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
        fullNutrients: []
      };
      log.push(item);
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
      const removed = log.pop();
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
      log = log.filter(i => i.id !== id);
    } else {
      item.grams -= delta.grams;
      item.cal -= delta.cal;
      item.protein -= delta.protein;
      item.fat -= delta.fat;
      item.carbs -= delta.carbs;
      if (item.met !== null) item.met -= delta.met;
      if (item.grams <= 0) log = log.filter(i => i.id !== id);
    }
    saveLog();
    renderAll();
    showToast(`Undid last add to ${name}.`, null);
  }

  function removeItem(id) {
    log = log.filter(i => i.id !== id);
    if (lastAction && lastAction.id === id) lastAction = null;
    saveLog();
    renderAll();
  }

  // ── Quick add: resolve a plain food name to a real USDA record once,
  // then cache it so repeat taps don't need the network. ──
  async function resolveFood(name) {
    const key = name.trim().toLowerCase();
    if (quickAddCache[key]) return quickAddCache[key];
    const results = await window.USDA.searchFoods(name, 10);
    if (!results.length) return null;
    const rank = f => {
      if (f.dataType === 'Foundation') return 0;
      if (f.dataType === 'SR Legacy') return 1;
      if (f.dataType === 'Survey (FNDDS)') return 2;
      return 3;
    };
    results.sort((a, b) => rank(a) - rank(b));
    const best = results[0];
    quickAddCache[key] = best;
    saveQuickAddCache();
    return best;
  }

  function renderQuickAdd() {
    const grid = document.getElementById('quickGrid');
    grid.innerHTML = '';
    quickAddFoods.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quickBtn';
      btn.textContent = name;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = name + '<span class="qLoading">Adding…</span>';
        try {
          const food = await resolveFood(name);
          if (!food) showToast(`Couldn't find "${name}" — try Search instead.`, 'over');
          else addFoodToLog(food, 100);
        } catch (e) {
          showToast('Couldn\'t reach the food database. Check your connection.', 'over');
        }
        btn.disabled = false;
        btn.textContent = name;
      });
      grid.appendChild(btn);
    });
  }

  // ── Search (secondary path) ──
  async function runSearch() {
    const raw = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('resultsList');
    if (!raw) { status.textContent = 'Type a food to search.'; return; }
    status.textContent = 'Searching…';
    list.innerHTML = '';
    try {
      const results = await window.USDA.searchFoods(raw, 8);
      status.textContent = results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results — try a different word.';
      results.slice(0, 8).forEach(food => {
        const n = food.nutrients;
        const hasMet = n.methionine !== null && n.methionine !== undefined;
        const estMet = hasMet ? null : estimateMethionine(n.protein, food.description);
        const metText = hasMet ? fmt(n.methionine) + ' mg' : (estMet !== null ? '~' + fmt(estMet) + ' mg (estimated)' : 'not available');
        const row = document.createElement('div');
        row.className = 'resultItem';
        row.innerHTML = `
          <span class="rName">${food.description}</span>
          <span class="rMeta">per 100g — ${fmt(n.energy)} cal · ${metText} methionine</span>
          <button type="button" class="bigBtn">+ Add 100g</button>
        `;
        row.querySelector('button').addEventListener('click', () => addFoodToLog(food, 100));
        list.appendChild(row);
      });
    } catch (e) {
      status.textContent = 'Could not reach the food database. Check your connection.';
    }
  }

  // ── Today's item list ──
  function renderItemList() {
    const container = document.getElementById('itemList');
    container.innerHTML = '';
    if (!log.length) {
      container.innerHTML = '<div class="emptyNote">Nothing logged yet today.</div>';
      return;
    }
    log.forEach(item => {
      const row = document.createElement('div');
      row.className = 'itemRow';
      const metText = item.met === null ? '?' : (item.metEstimated ? '~' + fmt(item.met) : fmt(item.met));
      row.innerHTML = `
        <span>
          <span class="iName">${item.name}</span><br>
          <span class="iMeta">${item.grams != null ? fmt(item.grams) + ' g · ' : ''}${metText} mg methionine</span>
        </span>
        <button type="button" class="rmBtn" title="Remove">×</button>
      `;
      row.querySelector('.rmBtn').addEventListener('click', () => removeItem(item.id));
      container.appendChild(row);
    });
  }

  // ── Methioninase ──
  // The Time/Amount/Notes form only auto-opens right after tapping "Yes"
  // (there's a time to record); tapping "No" just logs a plain no, and
  // once anything's logged the Yes/No buttons hide behind a status line
  // + a small Edit link so the screen doesn't stack banner + buttons +
  // an empty form all at once.
  function renderMethio() {
    const all = loadMethio();
    const entry = all[todayISO()];
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
      if (entry.took) {
        statusEl.textContent = '✅ Took methioninase today' + (entry.time ? ` at ${entry.time}` : '');
        statusEl.className = 'methioStatus logged-yes';
      } else {
        statusEl.textContent = '❌ Not taken today';
        statusEl.className = 'methioStatus logged-no';
      }
    }
    document.getElementById('methioTime').value = entry ? (entry.time || '') : '';
    document.getElementById('methioAmount').value = entry ? (entry.amount || '') : '';
    document.getElementById('methioNotes').value = entry ? (entry.notes || '') : '';
    document.getElementById('methioDetails').hidden = true;
  }

  function setMethio(took) {
    const all = loadMethio();
    const existing = all[todayISO()] || {};
    all[todayISO()] = Object.assign({}, existing, { took, loggedAt: Date.now() });
    saveMethio(all);
    renderMethio();
    if (took) document.getElementById('methioDetails').hidden = false;
  }

  function saveMethioDetails(e) {
    if (e) e.preventDefault();
    const all = loadMethio();
    const existing = all[todayISO()] || { took: true };
    all[todayISO()] = Object.assign({}, existing, {
      time: document.getElementById('methioTime').value.trim(),
      amount: document.getElementById('methioAmount').value.trim(),
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
    const status = statusFor(total);
    const remaining = Math.max(0, dailyCap - total);
    const text = `${fmt(total)} milligrams used today, out of ${fmt(dailyCap)}. ${fmt(remaining)} milligrams still safe to eat. Status: ${statusLabel(status)}.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // ── Share ──
  function buildSummaryText() {
    const total = totalMet();
    const lines = [];
    lines.push(`Methionine log — ${todayISO()}`);
    lines.push(`Total: ${fmt(total)} / ${fmt(dailyCap)} mg (${statusLabel(statusFor(total))})`);
    lines.push('');
    if (log.length) {
      log.forEach(item => {
        const metText = item.met === null ? '?' : (item.metEstimated ? '~' + fmt(item.met) : fmt(item.met));
        lines.push(`- ${item.name} (${item.grams != null ? fmt(item.grams) + 'g' : 'n/a'}): ${metText} mg`);
      });
    } else {
      lines.push('(nothing logged)');
    }
    const all = loadMethio();
    const entry = all[todayISO()];
    lines.push('');
    lines.push('Methioninase: ' + (entry ? (entry.took ? 'Yes' + (entry.time ? ` at ${entry.time}` : '') : 'No') : 'Not logged'));
    if (entry && entry.notes) lines.push('Notes: ' + entry.notes);
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

  // There's no consumer Google Keep write API to call directly — the
  // Web Share API is the real equivalent: it hands the summary to the
  // OS share sheet, where Keep (or any notes app) shows up as a target
  // if it's installed. Desktop browsers mostly don't support it, so
  // fall back to clipboard there.
  async function shareSummary() {
    const text = buildSummaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Methionine Log — ' + todayISO(), text });
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
    const variantLabel = CONFIG.variantLabel || document.title;
    const subject = encodeURIComponent(`Methionine tracker feedback — ${variantLabel}`);
    const body = encodeURIComponent(
      `Version: ${variantLabel}\nLink: ${window.location.href}\n\nWhat worked:\n\n\nWhat didn't:\n\n`
    );
    window.location.href = `mailto:nutritiontracker@feisttech.com?subject=${subject}&body=${body}`;
  }

  // ── Tutorial walkthrough ──
  // Only opens on demand from the ❓ button now — it doesn't auto-launch,
  // since forcing a 6-step walkthrough in front of a quick-logging tool
  // is friction, not help.
  let tutorialStep = 0;
  function tutorialSteps() {
    const capLine = CONFIG.lockCap
      ? ' Your daily limit is set by your care team.'
      : ' Tap "Change daily limit" if that number ever needs to change.';
    return [
      { icon: '🔢', title: 'Your Daily Total', text: `This big number shows how much methionine you've eaten today. Green means safe, yellow means getting close, red means you're over your limit.${capLine}` },
      { icon: '🍽️', title: 'Quick Add', text: 'Tap any food button below and it gets added right away — no extra steps.' },
      { icon: '↩️', title: 'Made A Mistake?', text: 'Tap "Undo Last Add" any time to remove the food you just added.' },
      { icon: '🔍', title: "Can't Find Your Food?", text: 'Tap "Search For Another Food" to type it in, say it out loud, or scan a barcode.' },
      { icon: '💊', title: 'Methioninase', text: 'If you take methioninase, tap Yes or No each day to keep a record of it.' },
      { icon: '📤', title: 'Sharing Your Log', text: 'Use Send Feedback, Share, or Print any time to send today\'s log to your care team.' }
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
  // An inline numeric field instead of a native prompt() — prompt() can't
  // be given a numeric keyboard, and wrapping this in a <form> with an
  // explicit preventDefault means hitting Enter on a mobile keyboard
  // saves the value instead of doing whatever the browser's default
  // unhandled-Enter behavior would otherwise be.
  function openCapEdit() {
    document.getElementById('capEditInput').value = dailyCap;
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
      html5Qrcode = new Html5Qrcode('scanReader');
      html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        decodedText => {
          html5Qrcode.stop().catch(() => {});
          reader.hidden = true;
          document.getElementById('searchInput').value = decodedText;
          runSearch();
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
    loadState();
    renderAll();
    renderQuickAdd();
    renderMethio();
    wireVoice();
    wireScan();

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

    if (CONFIG.variantLabel) {
      const badge = document.getElementById('variantBadge');
      if (badge) { badge.textContent = CONFIG.variantLabel; badge.hidden = false; }
    }

    document.getElementById('btnToggleSearch').addEventListener('click', () => {
      const area = document.getElementById('searchArea');
      area.hidden = !area.hidden;
      if (!area.hidden) document.getElementById('searchInput').focus();
    });
    document.getElementById('searchForm').addEventListener('submit', e => {
      e.preventDefault();
      runSearch();
    });

    document.getElementById('btnMethioYes').addEventListener('click', () => setMethio(true));
    document.getElementById('btnMethioNo').addEventListener('click', () => setMethio(false));
    document.getElementById('btnMethioEdit').addEventListener('click', () => {
      document.getElementById('methioDetails').hidden = false;
    });
    document.getElementById('methioDetails').addEventListener('submit', saveMethioDetails);
    ['methioTime', 'methioAmount', 'methioNotes'].forEach(id => {
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
