(function () {
  'use strict';

  const LOG_KEY = 'feisttech_met_daily_log';
  const SHOPPING_KEY = 'feisttech_met_shopping_list';
  const CAP_KEY = 'feisttech_met_daily_cap';
  const PROTEIN_FLOOR_KEY = 'feisttech_met_protein_floor';
  const RECIPES_KEY = 'feisttech_met_recipes';

  const COMMON_FOODS = [
    'Chicken breast', 'Eggs', 'Rice', 'Broccoli', 'Spinach', 'Canned tuna',
    'Greek yogurt', 'Salmon', 'Black beans', 'Sweet potato', 'Ground beef', 'Tofu'
  ];

  let lists = { log: [], shopping: [] };
  let dailyCap = 150;
  let proteinFloor = 50;
  let activeTab = 'log';
  let html5Qrcode = null;

  function loadState() {
    try { lists.log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { lists.log = []; }
    try { lists.shopping = JSON.parse(localStorage.getItem(SHOPPING_KEY) || '[]'); } catch (e) { lists.shopping = []; }
    const cap = parseFloat(localStorage.getItem(CAP_KEY));
    if (!isNaN(cap) && cap > 0) dailyCap = cap;
    const floor = parseFloat(localStorage.getItem(PROTEIN_FLOOR_KEY));
    if (!isNaN(floor) && floor >= 0) proteinFloor = floor;
  }
  function saveList(target) {
    try { localStorage.setItem(target === 'log' ? LOG_KEY : SHOPPING_KEY, JSON.stringify(lists[target])); } catch (e) {}
  }
  function saveCap() {
    try { localStorage.setItem(CAP_KEY, String(dailyCap)); } catch (e) {}
  }
  function saveProteinFloor() {
    try { localStorage.setItem(PROTEIN_FLOOR_KEY, String(proteinFloor)); } catch (e) {}
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
  // USDA's search endpoint indexes gtinUpc in whichever format that
  // product's source data used — 12-digit UPC-A or 13-digit EAN with a
  // leading 0 — so a scanned code that comes back empty is retried in
  // the other format before giving up, instead of just reporting "no
  // results" for a product that's actually in the database.
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

  async function runSearch(fromBarcode) {
    const raw = document.getElementById('searchInput').value.trim();
    const status = document.getElementById('searchStatus');
    const list = document.getElementById('resultsList');
    if (!raw) { status.textContent = 'Type a food to search.'; return; }
    status.textContent = 'Searching USDA FoodData Central…';
    list.innerHTML = '';
    try {
      if (fromBarcode) {
        let results = await searchBarcodeVariants(raw);
        let usedFallback = false;
        if (!results.length && window.OpenFoodFacts) {
          status.textContent = 'Not in USDA — checking Open Food Facts…';
          try {
            const offFood = await window.OpenFoodFacts.lookupBarcode(raw);
            if (offFood) { results = [offFood]; usedFallback = true; }
          } catch (e) {}
        }
        status.textContent = results.length
          ? `${results.length} result${results.length === 1 ? '' : 's'}${usedFallback ? ' (from Open Food Facts — methionine will be a rough guess, not measured)' : ''}`
          : `Barcode ${raw} isn't in USDA or Open Food Facts — try searching by name instead.`;
        renderResults(results, null, true);
      } else {
        const { query, targetWeight } = parseInputString(raw);
        const results = await window.USDA.searchFoods(query, 15);
        status.textContent = results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results.';
        renderResults(results, targetWeight, false);
      }
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

  function renderResults(results, targetWeight, fromBarcode) {
    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    const ranked = dedupeAndRank(results);

    // A scanned barcode already identifies one specific commercial
    // product — there's no generic-vs-name-brand ambiguity to collapse
    // behind a toggle, so show every match directly instead of making
    // a successful scan require an extra tap to actually see it.
    if (fromBarcode) {
      ranked.forEach(food => list.appendChild(buildResultRow(food, targetWeight)));
      return;
    }

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
    wrap.style.gridColumn = '1 / -1';
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

  // Rough food-group -> emoji mapping, used as a fallback badge if a card's
  // photo fails to load — purely decorative, never a data value.
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

  // Large, real representative photos for each card — this is the single
  // most useful element for low-vision/cataract users, who can recognize a
  // food from a big picture far faster than from small text. These are
  // generic stock photos of the food GROUP (e.g. any banana), not a claim
  // about the specific USDA entry, so they carry no factual/nutrition risk
  // the way a typed-in number would. If a photo fails to load, the onerror
  // fallback below swaps in a large, high-contrast text-on-color card
  // instead of a tiny icon, so there is always something large to look at.
  const CARD_PHOTOS = [
    [/chicken|turkey|duck|poultry/i, 'https://images.unsplash.com/photo-1604503468506-a8da13d82586?w=600&q=80'],
    [/beef|steak/i, 'https://images.unsplash.com/photo-1607116667981-27e30c8c8a3f?w=600&q=80'],
    [/pork|ham|bacon|sausage/i, 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=600&q=80'],
    [/salmon/i, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80'],
    [/fish|tuna|shrimp|seafood/i, 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=600&q=80'],
    [/egg/i, 'https://images.unsplash.com/photo-1582722872450-11adadc1d407?w=600&q=80'],
    [/rice/i, 'https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=600&q=80'],
    [/pasta|spaghetti|noodle/i, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80'],
    [/broccoli/i, 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600&q=80'],
    [/cauliflower/i, 'https://images.unsplash.com/photo-1568584711075-3d9217eedd3f?w=600&q=80'],
    [/shiitake|mushroom/i, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80'],
    [/spinach|kale|greens/i, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80'],
    [/lettuce|salad/i, 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=600&q=80'],
    [/cabbage/i, 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=600&q=80'],
    [/tomato/i, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80'],
    [/potato/i, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80'],
    [/onion/i, 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=600&q=80'],
    [/asparagus/i, 'https://images.unsplash.com/photo-1515471209610-dae1c92d8777?w=600&q=80'],
    [/brussels/i, 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=600&q=80'],
    [/banana/i, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80'],
    [/apple/i, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80'],
    [/blueberry|blueberries/i, 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600&q=80'],
    [/strawberry|strawberries/i, 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=600&q=80'],
    [/berry|berries/i, 'https://images.unsplash.com/photo-1563746098251-d35aef196e83?w=600&q=80'],
    [/mango/i, 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=80'],
    [/orange|citrus/i, 'https://images.unsplash.com/photo-1547514701-42782101795e?w=600&q=80'],
    [/grapefruit/i, 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=600&q=80'],
    [/kiwi/i, 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=600&q=80'],
    [/pineapple/i, 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&q=80'],
    [/melon|cantaloupe|honeydew|watermelon/i, 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=600&q=80'],
    [/yogurt/i, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80'],
    [/milk|cheese|dairy/i, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80'],
    [/bean|lentil|legume/i, 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=600&q=80'],
    [/bread|oat|wheat/i, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'],
    [/oil/i, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80'],
    [/nut|almond|walnut/i, 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80'],
    [/pizza/i, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80'],
    [/soup/i, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80']
  ];
  function photoFor(description) {
    const match = CARD_PHOTOS.find(([re]) => re.test(description || ''));
    return match ? match[1] : null;
  }
  // High-contrast, large text-on-color fallback — used when there's no
  // photo match at all, or when the matched photo URL fails to load.
  function placeholderPhoto(description) {
    return `https://placehold.co/600x400/1e293b/e5e7eb?font=roboto&text=${encodeURIComponent(iconFor(description) + '  ' + (description || 'Food').slice(0, 28))}`;
  }

  function buildResultRow(food, targetWeight) {
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const estMet = hasMet ? null : estimateMethionine(n.protein, food.description);
    const isWholeFood = food.dataType === 'Foundation' || food.dataType === 'SR Legacy';
    const defaultGrams = targetWeight ? Math.round(targetWeight) : 100;
    const sourceUrl = food.sourceUrl || `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`;
    const metMeasured = hasMet;
    const metDisplay = hasMet
      ? fmt(n.methionine) + ' mg'
      : (estMet !== null ? '~' + fmt(estMet) + ' mg' : 'not available');
    const metLabel = hasMet ? 'Methionine (lab-measured)' : (estMet !== null ? 'Methionine (rough estimate)' : 'Methionine');

    const photoUrl = photoFor(food.description) || placeholderPhoto(food.description);
    const fallbackUrl = placeholderPhoto(food.description);

    const row = document.createElement('div');
    row.className = 'resultItem';
    row.innerHTML = `
      <img class="cardImage" src="${photoUrl}" alt="${food.description}" loading="lazy"
           onerror="this.onerror=null;this.src='${fallbackUrl}';">
      <div class="cardTop">
        <span class="cardIcon">${iconFor(food.description)}</span>
        <div class="cardTitleWrap">
          <span class="resultName">${food.description}</span>
          <span class="resultMeta">${food.brandOwner ? food.brandOwner + ' · ' : ''}per 100g</span>
        </div>
        <span class="dtBadge ${isWholeFood ? 'good' : ''}">${food.dataType || 'unknown'}</span>
      </div>
      <div class="cardBody">
        <div class="nutrientGrid2">
          <div class="nCell"><span class="nLabel">Calories</span><span class="nValue">${fmt(n.energy)}</span></div>
          <div class="nCell"><span class="nLabel">Protein</span><span class="nValue">${fmt(n.protein)} g</span></div>
          <div class="nCell"><span class="nLabel">Fat</span><span class="nValue">${fmt(n.fat)} g</span></div>
          <div class="nCell"><span class="nLabel">Carbs</span><span class="nValue">${fmt(n.carbs)} g</span></div>
        </div>
        <div class="metBox ${metMeasured ? 'measured' : ''}">
          <span class="mLabel">${metLabel}</span>
          <span class="mValue">${metDisplay}</span>
        </div>
        <a class="sourceLink" href="${sourceUrl}" target="_blank" rel="noopener">USDA Source ↗</a>
        <span class="addRow">
          <input type="number" class="gramsInput" value="${defaultGrams}" min="1" step="1"> g
          <button type="button" class="addBtn">+ Add</button>
        </span>
      </div>
    `;
    row.querySelector('.addBtn').addEventListener('click', () => {
      const grams = parseFloat(row.querySelector('.gramsInput').value) || 100;
      addToList(getAddTarget(), food, grams);
    });
    return row;
  }

  function mergeFullNutrients(a, b) {
    const map = {};
    (a || []).forEach(fn => { map[fn.name] = { name: fn.name, unit: fn.unit, value: fn.value }; });
    (b || []).forEach(fn => {
      if (map[fn.name]) map[fn.name].value += fn.value;
      else map[fn.name] = { name: fn.name, unit: fn.unit, value: fn.value };
    });
    return Object.values(map);
  }

  // ── Lists (Today's Log + Shopping List) ──
  // Adding the same food again merges into its existing row (grams and
  // every nutrient add up) instead of creating a second line.
  function addToList(target, food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const metEstimated = !hasMet;
    const met = hasMet ? n.methionine * scale : (estimateMethionine(n.protein, food.description) !== null ? estimateMethionine(n.protein, food.description) * scale : null);
    const newFullNutrients = (food.fullNutrients || []).map(fn => ({ name: fn.name, unit: fn.unit, value: fn.value * scale }));

    const existing = lists[target].find(i => i.name === food.description && i.metEstimated === metEstimated);
    if (existing) {
      existing.grams = (existing.grams || 0) + grams;
      existing.cal = (existing.cal || 0) + (n.energy !== null ? n.energy * scale : 0);
      existing.protein = (existing.protein || 0) + (n.protein !== null ? n.protein * scale : 0);
      existing.fat = (existing.fat || 0) + (n.fat !== null ? n.fat * scale : 0);
      existing.carbs = (existing.carbs || 0) + (n.carbs !== null ? n.carbs * scale : 0);
      existing.met = (existing.met === null && met === null) ? null : (existing.met || 0) + (met || 0);
      existing.fullNutrients = mergeFullNutrients(existing.fullNutrients, newFullNutrients);
    } else {
      lists[target].push({
        id: newId('item'),
        name: food.description,
        grams,
        cal: n.energy !== null ? n.energy * scale : null,
        protein: n.protein !== null ? n.protein * scale : null,
        fat: n.fat !== null ? n.fat * scale : null,
        carbs: n.carbs !== null ? n.carbs * scale : null,
        met,
        metEstimated,
        fullNutrients: newFullNutrients
      });
    }
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
    const totalProId = target === 'log' ? 'logTotalPro' : 'shoppingTotalPro';
    const totalMetId = target === 'log' ? 'logTotalMet' : 'shoppingTotalMet';
    const body = document.getElementById(bodyId);
    body.innerHTML = '';
    let totalCal = 0, totalPro = 0, totalMet = 0, hasUnknownMet = false, hasEstimated = false, hasUnknownPro = false;
    lists[target].forEach(item => {
      totalCal += item.cal || 0;
      if (item.protein !== null && item.protein !== undefined) totalPro += item.protein;
      else hasUnknownPro = true;
      if (item.met !== null) { totalMet += item.met; if (item.metEstimated) hasEstimated = true; }
      else hasUnknownMet = true;
      const tr = document.createElement('tr');
      const metCell = item.met === null
        ? '<span class="metUnknown">?</span>'
        : (item.metEstimated ? '<span class="metEstimated" title="Rough guess, not lab-measured">⚠️ ~' + fmt(item.met) + '</span>' : fmt(item.met));
      const proCell = (item.protein === null || item.protein === undefined) ? '<span class="metUnknown">?</span>' : fmt(item.protein);
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.grams !== null ? fmt(item.grams) : '—'}</td>
        <td>${fmt(item.cal)}</td>
        <td>${proCell}</td>
        <td>${metCell}</td>
        <td><button class="rmBtn" title="Remove">×</button></td>
      `;
      tr.querySelector('.rmBtn').addEventListener('click', () => removeFromList(target, item.id));
      body.appendChild(tr);
    });
    document.getElementById(totalCalId).textContent = fmt(totalCal);
    document.getElementById(totalProId).textContent = fmt(totalPro) + (hasUnknownPro ? '+' : '');
    document.getElementById(totalMetId).textContent = fmt(totalMet) + (hasUnknownMet ? '+' : '') + (hasEstimated ? '*' : '');

    if (target === 'log') {
      const pct = dailyCap > 0 ? Math.min(100, (totalMet / dailyCap) * 100) : 0;
      const fill = document.getElementById('metBarFill');
      fill.style.width = pct + '%';
      fill.classList.toggle('over', totalMet > dailyCap);
      let label = `${fmt(totalMet)} / ${fmt(dailyCap)} mg`;
      if (hasEstimated) label += ' ⚠️ includes rough guesses (marked ~) that are not lab-measured';
      if (hasUnknownMet) label += ' (some items have no methionine data)';
      document.getElementById('metBarLabel').textContent = label;
      document.getElementById('metBarLabel').classList.toggle('warnLabel', hasEstimated);

      const proPct = proteinFloor > 0 ? Math.min(100, (totalPro / proteinFloor) * 100) : 100;
      const proFill = document.getElementById('proBarFill');
      proFill.style.width = proPct + '%';
      proFill.classList.toggle('met', totalPro >= proteinFloor);
      let proLabel = `${fmt(totalPro)} / ${fmt(proteinFloor)} g`;
      if (hasUnknownPro) proLabel += ' (some items have no protein data)';
      document.getElementById('proBarLabel').textContent = proLabel;
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
  // Seed recipes store only {name, fdcId, grams} — no nutrition numbers.
  // Totals are fetched live from USDA per ingredient and cached in-memory
  // per session (not persisted) so repeat renders don't re-fetch.
  const liveFoodCache = {};
  async function fetchFoodDetailCached(fdcId) {
    if (liveFoodCache[fdcId]) return liveFoodCache[fdcId];
    const detail = await window.USDA.getFoodDetail(fdcId);
    liveFoodCache[fdcId] = detail;
    return detail;
  }

  async function computeLiveItemTotals(items) {
    const t = { cal: 0, fat: 0, carbs: 0, met: 0, pro: 0 };
    let missingPro = false, missingMet = false, anyFailed = false;
    for (const item of items) {
      try {
        const detail = await fetchFoodDetailCached(item.fdcId);
        const scale = item.grams / 100;
        const n = detail.nutrients;
        t.cal += (n.energy || 0) * scale;
        t.fat += (n.fat || 0) * scale;
        t.carbs += (n.carbs || 0) * scale;
        if (n.protein !== null && n.protein !== undefined) t.pro += n.protein * scale; else missingPro = true;
        if (n.methionine !== null && n.methionine !== undefined) t.met += n.methionine * scale; else missingMet = true;
      } catch (e) {
        anyFailed = true;
      }
    }
    if (missingPro) t.pro = null;
    if (missingMet) t.met = null;
    t.anyFailed = anyFailed;
    return t;
  }

  function renderRecipes() {
    const container = document.getElementById('recipeList');
    container.innerHTML = '';

    const seedHeader = document.createElement('div');
    seedHeader.className = 'nutrientRow';
    seedHeader.style.marginBottom = '0.2rem';
    seedHeader.textContent = 'Starter recipes (live USDA data, fetched on load):';
    container.appendChild(seedHeader);

    (window.SEED_RECIPES || []).forEach(recipe => {
      const ingredientNames = (recipe.items || []).map(i => `${i.name} (${i.grams}g)`);
      const row = buildRecipeRow(recipe.name, ingredientNames, null, () => loadSeedRecipe(recipe));
      container.appendChild(row);
      computeLiveItemTotals(recipe.items).then(totals => {
        const metaSpan = row.querySelector('.recipeTotals');
        if (!metaSpan) return;
        metaSpan.textContent = totals.anyFailed
          ? 'Could not fetch live USDA data for one or more ingredients'
          : `${fmt(totals.cal)} cal · ${fmt(totals.pro)} g pro · ${fmt(totals.met)} mg met (live)`;
      });
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

  function buildRecipeRow(name, ingredientNames, totals, onLoad) {
    const row = document.createElement('div');
    row.className = 'recipeItem';
    const metaText = totals
      ? `${fmt(totals.cal)} cal · ${fmt(totals.pro)} g pro · ${fmt(totals.met)} mg met`
      : 'Fetching live USDA data…';
    row.innerHTML = `
      <span class="name">${name}<br><span class="meta">${ingredientNames.join(', ')}</span></span>
      <span class="meta recipeTotals">${metaText}</span>
    `;
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', onLoad);
    row.appendChild(loadBtn);
    return row;
  }

  // Seed recipes only carry {name, fdcId, grams} — every nutrient comes
  // from a live USDA lookup at the moment the recipe is loaded into the
  // log, never from a number typed into this codebase.
  async function loadSeedRecipe(recipe) {
    for (const item of recipe.items) {
      try {
        const detail = await fetchFoodDetailCached(item.fdcId);
        const scale = item.grams / 100;
        const n = detail.nutrients;
        lists.log.push({
          id: newId('item'),
          name: detail.description || item.name,
          grams: item.grams,
          cal: n.energy !== null ? n.energy * scale : null,
          fat: n.fat !== null ? n.fat * scale : null,
          carbs: n.carbs !== null ? n.carbs * scale : null,
          protein: n.protein !== null ? n.protein * scale : null,
          met: n.methionine !== null ? n.methionine * scale : null,
          metEstimated: false,
          fullNutrients: (detail.fullNutrients || []).map(fn => ({ name: fn.name, unit: fn.unit, value: fn.value * scale }))
        });
      } catch (e) {
        alert(`Could not fetch live USDA data for "${item.name}" — skipped. (${e.message})`);
      }
    }
    saveList('log');
    renderList('log');
  }

  function loadCustomRecipe(recipe) {
    recipe.items.forEach(i => {
      lists.log.push({ id: newId('item'), name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, protein: i.protein !== undefined ? i.protein : null, metEstimated: !!i.metEstimated, fullNutrients: [] });
    });
    saveList('log');
    renderList('log');
  }

  function saveCurrentLogAsRecipe() {
    if (lists.log.length === 0) { alert('Add at least one item to today\'s log before saving it as a recipe.'); return; }
    const name = prompt('Name this recipe:', '');
    if (!name || !name.trim()) return;
    const totals = { cal: 0, fat: 0, carbs: 0, met: 0, pro: 0 };
    let missingPro = false;
    lists.log.forEach(i => {
      totals.cal += i.cal || 0; totals.fat += i.fat || 0; totals.carbs += i.carbs || 0; totals.met += i.met || 0;
      if (i.protein === null || i.protein === undefined) missingPro = true; else totals.pro += i.protein;
    });
    if (missingPro) totals.pro = null;
    const recipe = {
      id: 'recipe_' + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      items: lists.log.map(i => ({ name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, protein: i.protein, metEstimated: i.metEstimated })),
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
      // Retail products are 1D barcodes (UPC/EAN), not QR codes — without
      // an explicit format list the decoder defaults to a narrower set
      // and mostly only catches whichever product has the cleanest,
      // largest barcode. Listing every common retail format, and using a
      // wide/short scan box that actually matches a UPC/EAN's shape
      // (default was a near-square box sized for QR codes), makes
      // ordinary grocery barcodes decode reliably instead of by luck.
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
    document.getElementById('dailyProteinFloorInput').value = proteinFloor;
    document.getElementById('btnSearch').addEventListener('click', () => runSearch());
    document.getElementById('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') runSearch();
    });
    // Live search-as-you-type: results start populating a moment after
    // typing stops, instead of requiring an explicit Search tap first.
    let searchDebounceTimer = null;
    document.getElementById('searchInput').addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      const val = document.getElementById('searchInput').value.trim();
      if (val.length < 2) return;
      searchDebounceTimer = setTimeout(() => runSearch(), 400);
    });
    document.getElementById('dailyCapInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) { dailyCap = v; saveCap(); renderList('log'); }
    });
    document.getElementById('dailyProteinFloorInput').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v >= 0) { proteinFloor = v; saveProteinFloor(); renderList('log'); }
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
