(function () {
  'use strict';

  const LOG_KEY = 'feisttech_met_daily_log';
  const SHOPPING_KEY = 'feisttech_met_shopping_list';
  const CAP_KEY = 'feisttech_met_daily_cap';
  const RECIPES_KEY = 'feisttech_met_recipes';

  const COMMON_FOODS = [
    'Chicken breast', 'Eggs', 'Rice', 'Broccoli', 'Spinach', 'Canned tuna',
    'Greek yogurt', 'Salmon', 'Black beans', 'Sweet potato', 'Ground beef', 'Tofu'
  ];

  let lists = { log: [], shopping: [] };
  let dailyCap = 150;
  let activeTab = 'log';
  let html5Qrcode = null;

  function loadState() {
    try { lists.log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { lists.log = []; }
    try { lists.shopping = JSON.parse(localStorage.getItem(SHOPPING_KEY) || '[]'); } catch (e) { lists.shopping = []; }
    const cap = parseFloat(localStorage.getItem(CAP_KEY));
    if (!isNaN(cap) && cap > 0) dailyCap = cap;
  }
  function saveList(target) {
    try { localStorage.setItem(target === 'log' ? LOG_KEY : SHOPPING_KEY, JSON.stringify(lists[target])); } catch (e) {}
  }
  function saveCap() {
    try { localStorage.setItem(CAP_KEY, String(dailyCap)); } catch (e) {}
  }
  function getCustomRecipes() {
    try { return JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveCustomRecipes(list) {
    try { localStorage.setItem(RECIPES_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return Math.round(n * 10) / 10;
  }
  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // When USDA has no measured methionine value, estimate it as a share of
  // total protein: 1.5% for produce, 2.5% for canned goods, 3.5% for meat.
  const MEAT_WORDS = ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'poultry', 'bacon', 'sausage', 'veal', 'duck', 'goat', 'meat', 'steak', 'ham'];
  const CANNED_WORDS = ['canned', 'can,', 'in syrup', 'in brine', 'in sauce'];
  function estimateMethionineRate(description) {
    const d = (description || '').toLowerCase();
    if (CANNED_WORDS.some(w => d.includes(w))) return 0.025;
    if (MEAT_WORDS.some(w => d.includes(w))) return 0.035;
    return 0.015;
  }
  // USDA reports methionine (nutrient 506) in mg but protein (203) in g,
  // so the protein-share estimate needs a g->mg conversion (*1000) to be
  // comparable to real measured methionine values.
  function estimateMethionine(proteinG, description) {
    if (proteinG === null || proteinG === undefined) return null;
    return proteinG * estimateMethionineRate(description) * 1000;
  }

  // ── Natural-language quantity parsing: "6 oz chicken breast" ──
  function parseInputString(input) {
    const regex = /^([\d.]+)\s*(oz|ounces?|lbs?|pounds?|g|grams?)\s*(?:of\s+)?(.*)$/i;
    const match = input.match(regex);
    let targetWeight = null;
    let query = input;
    if (match) {
      const quantity = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      query = match[3];
      if (unit.startsWith('oz') || unit.startsWith('ounce')) targetWeight = quantity * 28.3495;
      else if (unit.startsWith('lb') || unit.startsWith('pound')) targetWeight = quantity * 453.592;
      else if (unit.startsWith('g') || unit.startsWith('gram')) targetWeight = quantity;
    }
    return { query: query.trim(), targetWeight };
  }

  // ── Search ──
  async function runSearch() {
    const raw = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('resultsList');
    if (!raw) { status.textContent = 'Type a food to search.'; return; }
    const { query, targetWeight } = parseInputString(raw);
    status.textContent = 'Searching USDA FoodData Central…';
    list.innerHTML = '';
    try {
      const results = await window.USDA.searchFoods(query, 15);
      status.textContent = results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results.';
      renderResults(results, targetWeight);
    } catch (e) {
      status.textContent = 'Search failed: ' + e.message;
    }
  }

  function getAddTarget() {
    const checked = document.querySelector('input[name="addTarget"]:checked');
    return checked ? checked.value : 'log';
  }

  // Lab-measured (Foundation/SR Legacy) and survey entries come first;
  // name-brand products vary by manufacturer and are often estimated, not
  // measured, so they're ranked last and grouped behind a toggle instead
  // of interleaved with the generic results people actually search for.
  function sourceRank(food) {
    if (food.dataType === 'Foundation') return 0;
    if (food.dataType === 'SR Legacy') return 1;
    if (food.dataType === 'Survey (FNDDS)') return 2;
    return 3; // Branded
  }

  // The same food is often returned more than once (different fdcId per
  // USDA dataset revision) — collapse exact-description duplicates and
  // keep the highest-ranked (most likely lab-measured) copy.
  function dedupeAndRank(results) {
    const seen = new Set();
    const deduped = [];
    results.forEach(food => {
      const key = (food.description || '').trim().toLowerCase() + '|' + (food.dataType || '') + '|' + (food.brandOwner || '');
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(food);
    });
    deduped.sort((a, b) => sourceRank(a) - sourceRank(b));
    return deduped;
  }

  const INITIAL_RESULTS = 5;

  function renderResults(results, targetWeight) {
    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    const ranked = dedupeAndRank(results);
    const generic = ranked.filter(f => f.dataType !== 'Branded');
    const branded = ranked.filter(f => f.dataType === 'Branded');

    generic.slice(0, INITIAL_RESULTS).forEach(food => list.appendChild(buildResultRow(food, targetWeight)));
    const genericMore = generic.slice(INITIAL_RESULTS);
    if (genericMore.length) {
      list.appendChild(buildShowMoreRow(`Show ${genericMore.length} more result${genericMore.length === 1 ? '' : 's'}`, genericMore, targetWeight));
    }
    if (branded.length) {
      list.appendChild(buildShowMoreRow(`Show ${branded.length} name-brand result${branded.length === 1 ? '' : 's'} (varies by manufacturer)`, branded, targetWeight));
    }
  }

  function buildShowMoreRow(label, foods, targetWeight) {
    const wrap = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary showMoreBtn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      foods.forEach(food => wrap.parentNode.insertBefore(buildResultRow(food, targetWeight), wrap));
      wrap.remove();
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function buildResultRow(food, targetWeight) {
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const estMet = hasMet ? null : estimateMethionine(n.protein, food.description);
    const isWholeFood = food.dataType === 'Foundation' || food.dataType === 'SR Legacy';
    const defaultGrams = targetWeight ? Math.round(targetWeight) : 100;
    const sourceUrl = `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`;
    const row = document.createElement('div');
    row.className = 'resultItem';
    row.innerHTML = `
      <span class="resultName">${food.description}${food.brandOwner ? ' <span class="resultMeta">(' + food.brandOwner + ')</span>' : ''}</span>
      <span class="dtBadge ${isWholeFood ? 'good' : ''}">${food.dataType || 'unknown'}</span>
      <a class="sourceLink" href="${sourceUrl}" target="_blank" rel="noopener">Source ↗</a>
      <span class="nutrientRow">
        per 100g — <strong>${fmt(n.energy)}</strong> cal ·
        protein <strong>${fmt(n.protein)}</strong>g ·
        fat <strong>${fmt(n.fat)}</strong>g ·
        carbs <strong>${fmt(n.carbs)}</strong>g ·
        methionine ${
          hasMet ? '<strong>' + fmt(n.methionine) + '</strong> mg'
            : (estMet !== null ? '<span class="metEstimated">~' + fmt(estMet) + ' mg (estimated)</span>' : '<span class="metUnknown">not available</span>')
        }
      </span>
      <span class="addRow">
        <input type="number" class="gramsInput" value="${defaultGrams}" min="1" step="1"> g
        <button type="button" class="addBtn">+ Add</button>
      </span>
    `;
    row.querySelector('.addBtn').addEventListener('click', () => {
      const grams = parseFloat(row.querySelector('.gramsInput').value) || 100;
      addToList(getAddTarget(), food, grams);
    });
    return row;
  }

  // ── Lists (Today's Log + Shopping List) ──
  function addToList(target, food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const metEstimated = !hasMet;
    const met = hasMet ? n.methionine * scale : (estimateMethionine(n.protein, food.description) !== null ? estimateMethionine(n.protein, food.description) * scale : null);
    lists[target].push({
      id: newId('item'),
      name: food.description,
      grams,
      cal: n.energy !== null ? n.energy * scale : null,
      fat: n.fat !== null ? n.fat * scale : null,
      carbs: n.carbs !== null ? n.carbs * scale : null,
      met,
      metEstimated,
      fullNutrients: (food.fullNutrients || []).map(fn => ({ name: fn.name, unit: fn.unit, value: fn.value * scale }))
    });
    saveList(target);
    renderList(target);
  }

  function removeFromList(target, id) {
    lists[target] = lists[target].filter(l => l.id !== id);
    saveList(target);
    renderList(target);
  }

  function renderList(target) {
    const bodyId = target === 'log' ? 'logBody' : 'shoppingBody';
    const totalCalId = target === 'log' ? 'logTotalCal' : 'shoppingTotalCal';
    const totalMetId = target === 'log' ? 'logTotalMet' : 'shoppingTotalMet';
    const body = document.getElementById(bodyId);
    body.innerHTML = '';
    let totalCal = 0, totalMet = 0, hasUnknownMet = false, hasEstimated = false;
    lists[target].forEach(item => {
      totalCal += item.cal || 0;
      if (item.met !== null) { totalMet += item.met; if (item.metEstimated) hasEstimated = true; }
      else hasUnknownMet = true;
      const tr = document.createElement('tr');
      const metCell = item.met === null
        ? '<span class="metUnknown">?</span>'
        : (item.metEstimated ? '<span class="metEstimated">~' + fmt(item.met) + '</span>' : fmt(item.met));
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.grams !== null ? fmt(item.grams) : '—'}</td>
        <td>${fmt(item.cal)}</td>
        <td>${metCell}</td>
        <td><button class="rmBtn" title="Remove">×</button></td>
      `;
      tr.querySelector('.rmBtn').addEventListener('click', () => removeFromList(target, item.id));
      body.appendChild(tr);
    });
    document.getElementById(totalCalId).textContent = fmt(totalCal);
    document.getElementById(totalMetId).textContent = fmt(totalMet) + (hasUnknownMet ? '+' : '') + (hasEstimated ? '*' : '');

    if (target === 'log') {
      const pct = dailyCap > 0 ? Math.min(100, (totalMet / dailyCap) * 100) : 0;
      const fill = document.getElementById('metBarFill');
      fill.style.width = pct + '%';
      fill.classList.toggle('over', totalMet > dailyCap);
      let label = `${fmt(totalMet)} / ${fmt(dailyCap)} mg`;
      if (hasEstimated) label += ' (* includes estimated values)';
      if (hasUnknownMet) label += ' (some items have no methionine data)';
      document.getElementById('metBarLabel').textContent = label;
    }
  }

  // ── Full nutrition profile ──
  function showFullProfile(target) {
    const overlay = document.getElementById('profileOverlay');
    const grid = document.getElementById('profileGrid');
    const title = document.getElementById('profileTitle');
    title.textContent = target === 'log' ? 'Complete Log Nutrition Profile' : 'Complete Shopping List Nutrition Profile';
    grid.innerHTML = '';

    const agg = {};
    lists[target].forEach(item => {
      (item.fullNutrients || []).forEach(fn => {
        if (!agg[fn.name]) agg[fn.name] = { value: 0, unit: fn.unit };
        agg[fn.name].value += fn.value;
      });
    });

    const names = Object.keys(agg).sort();
    if (names.length === 0) {
      grid.innerHTML = '<div class="nutrientItem">No items with detailed nutrient data yet.</div>';
    }
    names.forEach(name => {
      const data = agg[name];
      if (data.value <= 0) return;
      const val = Number.isInteger(data.value) ? data.value : parseFloat(data.value.toFixed(3));
      const div = document.createElement('div');
      div.className = 'nutrientItem';
      div.innerHTML = `<strong>${name}</strong><span>${val} ${data.unit}</span>`;
      grid.appendChild(div);
    });
    overlay.hidden = false;
  }

  // ── Recipes ──
  function renderRecipes() {
    const container = document.getElementById('recipeList');
    container.innerHTML = '';

    const seedHeader = document.createElement('div');
    seedHeader.className = 'nutrientRow';
    seedHeader.style.marginBottom = '0.2rem';
    seedHeader.textContent = 'Starter recipes:';
    container.appendChild(seedHeader);

    (window.SEED_RECIPES || []).forEach(recipe => {
      const totals = recipe.totals || computeItemTotals(recipe.items);
      const ingredientNames = recipe.ingredients || (recipe.items || []).map(i => `${i[0]} (${i[1]}g)`);
      container.appendChild(buildRecipeRow(recipe.name, ingredientNames, totals, () => loadSeedRecipe(recipe)));
    });

    const customRecipes = getCustomRecipes();
    if (customRecipes.length) {
      const customHeader = document.createElement('div');
      customHeader.className = 'nutrientRow';
      customHeader.style.margin = '0.6rem 0 0.2rem';
      customHeader.textContent = 'Your saved recipes:';
      container.appendChild(customHeader);

      customRecipes.forEach(recipe => {
        const ingredientNames = recipe.items.map(i => `${i.name} (${i.grams}g)`);
        const row = buildRecipeRow(recipe.name, ingredientNames, recipe.totals, () => loadCustomRecipe(recipe));
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'danger';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
          if (!confirm(`Delete recipe "${recipe.name}"?`)) return;
          saveCustomRecipes(getCustomRecipes().filter(r => r.id !== recipe.id));
          renderRecipes();
        });
        row.appendChild(delBtn);
        container.appendChild(row);
      });
    }
  }

  function computeItemTotals(items) {
    const t = { cal: 0, fat: 0, carbs: 0, met: 0 };
    (items || []).forEach(i => { t.cal += i[2] || 0; t.fat += i[3] || 0; t.carbs += i[4] || 0; t.met += i[5] || 0; });
    return t;
  }

  function buildRecipeRow(name, ingredientNames, totals, onLoad) {
    const row = document.createElement('div');
    row.className = 'recipeItem';
    row.innerHTML = `
      <span class="name">${name}<br><span class="meta">${ingredientNames.join(', ')}</span></span>
      <span class="meta">${fmt(totals.cal)} cal · ${fmt(totals.met)} mg met</span>
    `;
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', onLoad);
    row.appendChild(loadBtn);
    return row;
  }

  function loadSeedRecipe(recipe) {
    if (recipe.items) {
      recipe.items.forEach(i => {
        lists.log.push({ id: newId('item'), name: i[0], grams: i[1], cal: i[2], fat: i[3], carbs: i[4], met: i[5], metEstimated: false, fullNutrients: [] });
      });
    } else if (recipe.totals) {
      lists.log.push({
        id: newId('item'),
        name: recipe.name + ' (' + recipe.ingredients.join(' + ') + ')',
        grams: null, cal: recipe.totals.cal, fat: recipe.totals.fat, carbs: recipe.totals.carbs, met: recipe.totals.met,
        metEstimated: false, fullNutrients: []
      });
    }
    saveList('log');
    renderList('log');
  }

  function loadCustomRecipe(recipe) {
    recipe.items.forEach(i => {
      lists.log.push({ id: newId('item'), name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, metEstimated: !!i.metEstimated, fullNutrients: [] });
    });
    saveList('log');
    renderList('log');
  }

  function saveCurrentLogAsRecipe() {
    if (lists.log.length === 0) { alert('Add at least one item to today\'s log before saving it as a recipe.'); return; }
    const name = prompt('Name this recipe:', '');
    if (!name || !name.trim()) return;
    const totals = { cal: 0, fat: 0, carbs: 0, met: 0 };
    lists.log.forEach(i => { totals.cal += i.cal || 0; totals.fat += i.fat || 0; totals.carbs += i.carbs || 0; totals.met += i.met || 0; });
    const recipe = {
      id: 'recipe_' + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      items: lists.log.map(i => ({ name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, metEstimated: i.metEstimated })),
      totals
    };
    const recipes = getCustomRecipes();
    recipes.unshift(recipe);
    saveCustomRecipes(recipes);
    renderRecipes();
  }

  // ── Tabs ──
  function wireTabs() {
    document.querySelectorAll('#listTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        document.querySelectorAll('#listTabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('tab-log').classList.toggle('active', activeTab === 'log');
        document.getElementById('tab-shopping').classList.toggle('active', activeTab === 'shopping');
      });
    });
  }

  // ── Voice input ──
  function wireVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById('btnMic');
    if (!SpeechRecognition) { micBtn.disabled = true; micBtn.title = 'Voice input not supported in this browser'; return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    micBtn.addEventListener('click', () => {
      recognition.start();
      micBtn.classList.add('listening');
    });
    recognition.onresult = e => {
      const txt = e.results[0][0].transcript;
      document.getElementById('searchInput').value = txt;
      runSearch();
    };
    recognition.onend = () => micBtn.classList.remove('listening');
    recognition.onerror = () => micBtn.classList.remove('listening');
  }

  // ── Barcode scanning ──
  function wireScan() {
    const scanBtn = document.getElementById('btnScan');
    const reader = document.getElementById('scanReader');
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

  // ── Quick add ──
  function renderQuickAdd() {
    const row = document.getElementById('quickAddRow');
    row.innerHTML = '';
    COMMON_FOODS.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chipBtn';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        document.getElementById('searchInput').value = name;
        runSearch();
      });
      row.appendChild(btn);
    });
  }

  // ── Modals ──
  function wireModal(btnId, overlayId, closeId) {
    const btn = document.getElementById(btnId);
    const overlay = document.getElementById(overlayId);
    const close = document.getElementById(closeId);
    btn.addEventListener('click', () => { overlay.hidden = false; });
    close.addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.hidden = true; });
  }

  function init() {
    loadState();
    renderList('log');
    renderList('shopping');
    renderRecipes();
    renderQuickAdd();
    wireTabs();
    wireVoice();
    wireScan();

    document.getElementById('dailyCapInput').value = dailyCap;
    document.getElementById('btnSearch').addEventListener('click', runSearch);
    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') runSearch();
    });
    document.getElementById('dailyCapInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) { dailyCap = v; saveCap(); renderList('log'); }
    });
    document.getElementById('btnSaveRecipe').addEventListener('click', saveCurrentLogAsRecipe);
    document.getElementById('btnClearLog').addEventListener('click', () => {
      if (lists.log.length && !confirm('Clear today\'s log?')) return;
      lists.log = [];
      saveList('log');
      renderList('log');
    });
    document.getElementById('btnClearShopping').addEventListener('click', () => {
      if (lists.shopping.length && !confirm('Clear the shopping list?')) return;
      lists.shopping = [];
      saveList('shopping');
      renderList('shopping');
    });
    document.getElementById('btnPrintShopping').addEventListener('click', () => window.print());
    document.getElementById('btnViewLogProfile').addEventListener('click', () => showFullProfile('log'));
    document.getElementById('btnViewShoppingProfile').addEventListener('click', () => showFullProfile('shopping'));

    wireModal('btnHelp', 'helpOverlay', 'btnCloseHelp');
    wireModal('btnAbout', 'aboutOverlay', 'btnCloseAbout');
    wireModal('btnRecipes', 'recipeDrawerOverlay', 'btnCloseRecipes');
    document.getElementById('btnCloseProfile').addEventListener('click', () => { document.getElementById('profileOverlay').hidden = true; });
    document.getElementById('profileOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('profileOverlay')) e.target.hidden = true;
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      document.getElementById('helpOverlay').hidden = true;
      document.getElementById('aboutOverlay').hidden = true;
      document.getElementById('profileOverlay').hidden = true;
      document.getElementById('recipeDrawerOverlay').hidden = true;
    });

    if (window.FeistTheme) FeistTheme.mount('#themeSwitcherMount');
  }

  init();
})();
