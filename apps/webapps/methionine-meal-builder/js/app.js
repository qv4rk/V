(function () {
  'use strict';

  const LIST_KEY = 'feisttech_met_list';
  const RECIPES_KEY = 'feisttech_met_recipes';

  const COMMON_FOODS = [
    'Chicken breast', 'Eggs', 'Rice', 'Broccoli', 'Spinach', 'Canned tuna',
    'Greek yogurt', 'Salmon', 'Black beans', 'Sweet potato', 'Ground beef', 'Tofu'
  ];

  // A single running tally, no daily cap or goal of any kind — this tool
  // reports nutrient numbers only, it never sets or judges a target.
  let theList = [];
  let html5Qrcode = null;

  function loadState() {
    try { theList = JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch (e) { theList = []; }
  }
  function saveList() {
    try { localStorage.setItem(LIST_KEY, JSON.stringify(theList)); } catch (e) {}
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
  // generic photos of the food GROUP (e.g. any banana), not a claim about
  // the specific USDA entry, so they carry no factual/nutrition risk the
  // way a typed-in number would. Locally hosted, self-generated set — no
  // external stock-photo license to track, unlike the previous Unsplash
  // URLs. Ordered most-specific pattern first (e.g. "sweet potato" before
  // "potato") since the first regex match wins. If a photo fails to load,
  // the onerror fallback below swaps in a large, high-contrast
  // text-on-color card instead of a tiny icon, so there is always
  // something large to look at.
  // app.js is loaded by detailed/index.html, one directory below where
  // images/ lives (apps/webapps/methionine-meal-builder/images/food/),
  // so the path must climb up one level from the page's own location.
  const FOOD_IMG = '../images/food/';
  const CARD_PHOTOS = [
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
    [/blueberry|blueberries/i, FOOD_IMG + 'blueberries.png'],
    [/strawberry|strawberries/i, FOOD_IMG + 'strawberries.png'],
    [/berry|berries/i, FOOD_IMG + 'mixed_berries.png'],
    [/grape(?!fruit)/i, FOOD_IMG + 'grapes.png'],
    [/mango/i, FOOD_IMG + 'mango.png'],
    [/grapefruit/i, FOOD_IMG + 'grapefruit.png'],
    [/orange|citrus/i, FOOD_IMG + 'orange.png'],
    [/kiwi/i, FOOD_IMG + 'kiwi.png'],
    [/pineapple/i, FOOD_IMG + 'pineapple.png'],
    [/melon|cantaloupe|honeydew|watermelon/i, FOOD_IMG + 'melon.png'],
    [/yogurt/i, FOOD_IMG + 'greek_yogurt.png'],
    [/milk|cheese|dairy/i, FOOD_IMG + 'dairy_cheese.png'],
    [/lentil/i, FOOD_IMG + 'beans_lentils.png'],
    [/bean/i, FOOD_IMG + 'black_beans.png'],
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
  // High-contrast, large text-on-color fallback — used when there's no
  // photo match at all, or when the matched photo URL fails to load.
  function placeholderPhoto(description) {
    return `https://placehold.co/600x400/1e293b/e5e7eb?font=roboto&text=${encodeURIComponent(iconFor(description) + '  ' + (description || 'Food').slice(0, 28))}`;
  }

  // Renders every nutrient scaled to the current weight input — called
  // once up front and again any time the weight field changes, so the
  // whole card (styled like a familiar nutrition-facts label) always
  // reflects the actual serving size instead of always showing per-100g.
  function computeScaledValues(food, grams) {
    const n = food.nutrients;
    const scale = grams / 100;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const estMet = hasMet ? null : estimateMethionine(n.protein, food.description);
    const metRaw = hasMet ? n.methionine : estMet;
    return {
      cal: n.energy !== null ? n.energy * scale : null,
      protein: n.protein !== null ? n.protein * scale : null,
      fat: n.fat !== null ? n.fat * scale : null,
      carbs: n.carbs !== null ? n.carbs * scale : null,
      met: metRaw !== null ? metRaw * scale : null,
      metMeasured: hasMet
    };
  }

  function buildResultRow(food, targetWeight) {
    const isWholeFood = food.dataType === 'Foundation' || food.dataType === 'SR Legacy';
    const defaultGrams = targetWeight ? Math.round(targetWeight) : 100;
    const sourceUrl = food.sourceUrl || `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`;

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
          <span class="resultMeta">${food.brandOwner ? food.brandOwner + ' · ' : ''}</span>
        </div>
        <span class="dtBadge ${isWholeFood ? 'good' : ''}">${food.dataType || 'unknown'}</span>
      </div>
      <div class="nutritionLabel">
        <div class="nutritionLabel-servingRow">
          <label>Weight</label>
          <span><input type="number" class="gramsInput" value="${defaultGrams}" min="1" step="1"> g</span>
        </div>
        <div class="nutritionLabel-rule thick"></div>
        <div class="nutritionLabel-calories">
          <span>Calories</span><span class="nlValue" data-field="cal"></span>
        </div>
        <div class="nutritionLabel-rule thick"></div>
        <div class="nutritionLabel-row"><span>Protein</span><span class="nlValue" data-field="protein"></span></div>
        <div class="nutritionLabel-row"><span>Total Fat</span><span class="nlValue" data-field="fat"></span></div>
        <div class="nutritionLabel-row"><span>Total Carbohydrate</span><span class="nlValue" data-field="carbs"></span></div>
        <div class="nutritionLabel-rule"></div>
        <div class="nutritionLabel-row metRow"><span class="metRowLabel" data-field="metLabel"></span><span class="nlValue" data-field="met"></span></div>
        <a class="sourceLink" href="${sourceUrl}" target="_blank" rel="noopener">USDA Source ↗</a>
      </div>
      <span class="addRow">
        <button type="button" class="addBtn">+ Add to Your List</button>
      </span>
    `;

    const gramsInput = row.querySelector('.gramsInput');
    function refresh() {
      const grams = parseFloat(gramsInput.value) || 0;
      const v = computeScaledValues(food, grams);
      row.querySelector('[data-field="cal"]').textContent = fmt(v.cal);
      row.querySelector('[data-field="protein"]').textContent = fmt(v.protein) + ' g';
      row.querySelector('[data-field="fat"]').textContent = fmt(v.fat) + ' g';
      row.querySelector('[data-field="carbs"]').textContent = fmt(v.carbs) + ' g';
      const metRow = row.querySelector('.metRow');
      const metLabelEl = row.querySelector('[data-field="metLabel"]');
      const metValueEl = row.querySelector('[data-field="met"]');
      if (v.met === null) {
        metLabelEl.textContent = 'Methionine';
        metValueEl.textContent = 'not available';
        metRow.classList.remove('measured');
      } else {
        metLabelEl.textContent = v.metMeasured ? 'Methionine (lab-measured)' : 'Methionine (rough estimate)';
        metValueEl.textContent = (v.metMeasured ? '' : '~') + fmt(v.met) + ' mg';
        metRow.classList.toggle('measured', v.metMeasured);
      }
    }
    gramsInput.addEventListener('input', refresh);
    refresh();

    row.querySelector('.addBtn').addEventListener('click', () => {
      const grams = parseFloat(gramsInput.value) || 100;
      addToList(food, grams);
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

  // ── Your List ──
  // Adding the same food again merges into its existing row (grams and
  // every nutrient add up) instead of creating a second line. This is a
  // plain additive tally — no cap, no goal, nothing compared against it.
  function addToList(food, grams) {
    const scale = grams / 100;
    const n = food.nutrients;
    const hasMet = n.methionine !== null && n.methionine !== undefined;
    const metEstimated = !hasMet;
    const met = hasMet ? n.methionine * scale : (estimateMethionine(n.protein, food.description) !== null ? estimateMethionine(n.protein, food.description) * scale : null);
    const newFullNutrients = (food.fullNutrients || []).map(fn => ({ name: fn.name, unit: fn.unit, value: fn.value * scale }));

    const existing = theList.find(i => i.name === food.description && i.metEstimated === metEstimated);
    if (existing) {
      existing.grams = (existing.grams || 0) + grams;
      existing.cal = (existing.cal || 0) + (n.energy !== null ? n.energy * scale : 0);
      existing.protein = (existing.protein || 0) + (n.protein !== null ? n.protein * scale : 0);
      existing.fat = (existing.fat || 0) + (n.fat !== null ? n.fat * scale : 0);
      existing.carbs = (existing.carbs || 0) + (n.carbs !== null ? n.carbs * scale : 0);
      existing.met = (existing.met === null && met === null) ? null : (existing.met || 0) + (met || 0);
      existing.fullNutrients = mergeFullNutrients(existing.fullNutrients, newFullNutrients);
    } else {
      theList.push({
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
    saveList();
    renderList();
  }

  function removeFromList(id) {
    theList = theList.filter(l => l.id !== id);
    saveList();
    renderList();
  }

  function renderList() {
    const body = document.getElementById('logBody');
    body.innerHTML = '';
    let totalCal = 0, totalPro = 0, totalMet = 0, hasUnknownMet = false, hasEstimated = false, hasUnknownPro = false;
    theList.forEach(item => {
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
        <td data-label="Food">${item.name}</td>
        <td data-label="g">${item.grams !== null ? fmt(item.grams) : '—'}</td>
        <td data-label="Cal">${fmt(item.cal)}</td>
        <td data-label="Pro (g)">${proCell}</td>
        <td data-label="Met (mg)">${metCell}</td>
        <td data-label=""><button class="rmBtn" title="Remove">×</button></td>
      `;
      tr.querySelector('.rmBtn').addEventListener('click', () => removeFromList(item.id));
      body.appendChild(tr);
    });
    document.getElementById('logTotalCal').textContent = fmt(totalCal);
    document.getElementById('logTotalPro').textContent = fmt(totalPro) + (hasUnknownPro ? '+' : '');
    document.getElementById('logTotalMet').textContent = fmt(totalMet) + (hasUnknownMet ? '+' : '') + (hasEstimated ? '*' : '');
  }

  // ── Full nutrition profile ──
  function showFullProfile() {
    const overlay = document.getElementById('profileOverlay');
    const grid = document.getElementById('profileGrid');
    const title = document.getElementById('profileTitle');
    title.textContent = 'Complete Nutrition Profile';
    grid.innerHTML = '';

    const agg = {};
    theList.forEach(item => {
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
        theList.push({
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
    saveList();
    renderList();
  }

  function loadCustomRecipe(recipe) {
    recipe.items.forEach(i => {
      theList.push({ id: newId('item'), name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, protein: i.protein !== undefined ? i.protein : null, metEstimated: !!i.metEstimated, fullNutrients: [] });
    });
    saveList();
    renderList();
  }

  function saveCurrentLogAsRecipe() {
    if (theList.length === 0) { alert('Add at least one item to Your List before saving it as a recipe.'); return; }
    const name = prompt('Name this recipe:', '');
    if (!name || !name.trim()) return;
    const totals = { cal: 0, fat: 0, carbs: 0, met: 0, pro: 0 };
    let missingPro = false;
    theList.forEach(i => {
      totals.cal += i.cal || 0; totals.fat += i.fat || 0; totals.carbs += i.carbs || 0; totals.met += i.met || 0;
      if (i.protein === null || i.protein === undefined) missingPro = true; else totals.pro += i.protein;
    });
    if (missingPro) totals.pro = null;
    const recipe = {
      id: 'recipe_' + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      items: theList.map(i => ({ name: i.name, grams: i.grams, cal: i.cal, fat: i.fat, carbs: i.carbs, met: i.met, protein: i.protein, metEstimated: i.metEstimated })),
      totals
    };
    const recipes = getCustomRecipes();
    recipes.unshift(recipe);
    saveCustomRecipes(recipes);
    renderRecipes();
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
    renderList();
    renderRecipes();
    renderQuickAdd();
    wireVoice();
    wireScan();

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
    document.getElementById('btnSaveRecipe').addEventListener('click', saveCurrentLogAsRecipe);
    document.getElementById('btnClearLog').addEventListener('click', () => {
      if (theList.length && !confirm('Clear your list?')) return;
      theList = [];
      saveList();
      renderList();
    });
    document.getElementById('btnPrintList').addEventListener('click', () => window.print());
    document.getElementById('btnViewLogProfile').addEventListener('click', () => showFullProfile());

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
