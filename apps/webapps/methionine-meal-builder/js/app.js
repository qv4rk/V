(function () {
  'use strict';

  const LOG_KEY = 'feisttech_met_daily_log';
  const CAP_KEY = 'feisttech_met_daily_cap';
  const RECIPES_KEY = 'feisttech_met_recipes';

  let log = [];
  let dailyCap = 150;
  let lastSearchResults = [];

  function loadState() {
    try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { log = []; }
    const cap = parseFloat(localStorage.getItem(CAP_KEY));
    if (!isNaN(cap) && cap > 0) dailyCap = cap;
  }
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
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

  // ── Search ──
  async function runSearch() {
    const q = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('resultsList');
    if (!q) { status.textContent = 'Type a food to search.'; return; }
    status.textContent = 'Searching USDA FoodData Central…';
    list.innerHTML = '';
    try {
      const results = await window.USDA.searchFoods(q, 15);
      lastSearchResults = results;
      status.textContent = results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results.';
      renderResults(results);
    } catch (e) {
      status.textContent = 'Search failed: ' + e.message;
    }
  }

  function renderResults(results) {
    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    results.forEach((food, idx) => {
      const hasMet = food.nutrients.methionine !== null && food.nutrients.methionine !== undefined;
      const isWholeFood = food.dataType === 'Foundation' || food.dataType === 'SR Legacy';
      const row = document.createElement('div');
      row.className = 'resultItem';
      row.innerHTML = `
        <span class="resultName">${food.description}${food.brandOwner ? ' <span class="resultMeta">(' + food.brandOwner + ')</span>' : ''}</span>
        <span class="dtBadge ${isWholeFood ? 'good' : ''}">${food.dataType || 'unknown'}</span>
        <span class="nutrientRow">
          per 100g — <strong>${fmt(food.nutrients.energy)}</strong> cal ·
          fat <strong>${fmt(food.nutrients.fat)}</strong>g ·
          carbs <strong>${fmt(food.nutrients.carbs)}</strong>g ·
          methionine ${hasMet ? '<strong>' + fmt(food.nutrients.methionine) + '</strong> mg' : '<span class="metUnknown">not available</span>'}
        </span>
        <span class="addRow">
          <input type="number" class="gramsInput" value="100" min="1" step="1"> g
          <button type="button" class="addBtn" data-idx="${idx}">+ Add</button>
        </span>
      `;
      row.querySelector('.addBtn').addEventListener('click', () => {
        const grams = parseFloat(row.querySelector('.gramsInput').value) || 100;
        addToLog(food, grams);
      });
      list.appendChild(row);
    });
  }

  // ── Log ──
  function addToLog(food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    log.push({
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: food.description,
      grams,
      cal: n.energy !== null ? n.energy * scale : null,
      fat: n.fat !== null ? n.fat * scale : null,
      carbs: n.carbs !== null ? n.carbs * scale : null,
      met: n.methionine !== null ? n.methionine * scale : null
    });
    saveLog();
    renderLog();
  }

  function removeFromLog(id) {
    log = log.filter(l => l.id !== id);
    saveLog();
    renderLog();
  }

  function renderLog() {
    const body = document.getElementById('logBody');
    body.innerHTML = '';
    let totalCal = 0, totalMet = 0, hasUnknownMet = false;
    log.forEach(item => {
      totalCal += item.cal || 0;
      if (item.met !== null) totalMet += item.met;
      else hasUnknownMet = true;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${fmt(item.grams)}</td>
        <td>${fmt(item.cal)}</td>
        <td>${item.met !== null ? fmt(item.met) : '<span class="metUnknown">?</span>'}</td>
        <td><button class="rmBtn" title="Remove">×</button></td>
      `;
      tr.querySelector('.rmBtn').addEventListener('click', () => removeFromLog(item.id));
      body.appendChild(tr);
    });
    document.getElementById('logTotalCal').textContent = fmt(totalCal);
    document.getElementById('logTotalMet').textContent = fmt(totalMet) + (hasUnknownMet ? '+' : '');

    const pct = dailyCap > 0 ? Math.min(100, (totalMet / dailyCap) * 100) : 0;
    const fill = document.getElementById('metBarFill');
    fill.style.width = pct + '%';
    fill.classList.toggle('over', totalMet > dailyCap);
    document.getElementById('metBarLabel').textContent =
      `${fmt(totalMet)} / ${fmt(dailyCap)} mg` + (hasUnknownMet ? ' (some items have unmeasured methionine)' : '');
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
        log.push({
          id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          name: i[0], grams: i[1], cal: i[2], fat: i[3], carbs: i[4], met: i[5]
        });
      });
    } else if (recipe.totals) {
      log.push({
        id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: recipe.name + ' (' + recipe.ingredients.join(' + ') + ')',
        grams: null, cal: recipe.totals.cal, fat: recipe.totals.fat, carbs: recipe.totals.carbs, met: recipe.totals.met
      });
    }
    saveLog();
    renderLog();
  }

  function loadCustomRecipe(recipe) {
    recipe.items.forEach(i => {
      log.push({
        id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met
      });
    });
    saveLog();
    renderLog();
  }

  function saveCurrentLogAsRecipe() {
    if (log.length === 0) { alert('Add at least one item to today\'s log before saving it as a recipe.'); return; }
    const name = prompt('Name this recipe:', '');
    if (!name || !name.trim()) return;
    const totals = { cal: 0, fat: 0, carbs: 0, met: 0 };
    log.forEach(i => { totals.cal += i.cal || 0; totals.fat += i.fat || 0; totals.carbs += i.carbs || 0; totals.met += i.met || 0; });
    const recipe = {
      id: 'recipe_' + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      items: log.map(i => ({ name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met })),
      totals
    };
    const recipes = getCustomRecipes();
    recipes.unshift(recipe);
    saveCustomRecipes(recipes);
    renderRecipes();
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
    renderLog();
    renderRecipes();

    document.getElementById('dailyCapInput').value = dailyCap;
    document.getElementById('btnSearch').addEventListener('click', runSearch);
    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') runSearch();
    });
    document.getElementById('dailyCapInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) { dailyCap = v; saveCap(); renderLog(); }
    });
    document.getElementById('btnSaveRecipe').addEventListener('click', saveCurrentLogAsRecipe);
    document.getElementById('btnClearLog').addEventListener('click', () => {
      if (log.length && !confirm('Clear today\'s log?')) return;
      log = [];
      saveLog();
      renderLog();
    });

    wireModal('btnHelp', 'helpOverlay', 'btnCloseHelp');
    wireModal('btnAbout', 'aboutOverlay', 'btnCloseAbout');
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      document.getElementById('helpOverlay').hidden = true;
      document.getElementById('aboutOverlay').hidden = true;
    });

    if (window.FeistTheme) FeistTheme.mount('#themeSwitcherMount');
  }

  init();
})();
