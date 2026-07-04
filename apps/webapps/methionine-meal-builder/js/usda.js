window.USDA = (function () {
  'use strict';

  // api.data.gov keys are free and unmetered for billing purposes (USDA
  // FoodData Central has no paid tier) — rotating across a few keys just
  // buys headroom against the shared 1,000-req/hour default rate limit.
  const KEYS = [
    '6q7a4ZcqZkMpFPgxLFh5cW21Ij9QEuMJeLauNTmx',
    'uv68te90gmU4vhoKohdgGdOsFJJaDexLrV6dXfru',
    '23EWpb7ov7UADtCp6AWjZ1tntPyjR4MPWYGybQGw'
  ];
  let keyIndex = 0;

  // Legacy USDA nutrient numbers — stable across both /foods/search and
  // /food/{fdcId} response shapes, unlike the FDC-internal nutrient ids.
  const NUTRIENT_NUMBERS = {
    energy: '208',
    protein: '203',
    fat: '204',
    carbs: '205',
    methionine: '506'
  };

  async function fetchWithRotation(buildUrl) {
    let lastError;
    for (let i = 0; i < KEYS.length; i++) {
      const idx = (keyIndex + i) % KEYS.length;
      try {
        const res = await fetch(buildUrl(KEYS[idx]));
        if (res.status === 429 || res.status === 403) {
          lastError = new Error(`USDA key rejected (HTTP ${res.status})`);
          continue;
        }
        if (!res.ok) {
          lastError = new Error(`USDA API error (HTTP ${res.status})`);
          continue;
        }
        keyIndex = idx;
        return await res.json();
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('All USDA API keys failed');
  }

  // Methionine must always come out in mg — that's the unit people
  // actually think in for amino acid limits (e.g. Hoffman-protocol
  // discussions of a daily mg cap). USDA's own unitName tells us what the
  // raw value actually is (amino acids are commonly reported in grams,
  // not mg, unlike minerals) so we convert off that instead of assuming.
  function toMg(value, unit) {
    if (value === null || value === undefined) return null;
    const u = (unit || '').toLowerCase();
    if (u === 'mg') return value;
    if (u === 'g') return value * 1000;
    if (u === 'µg' || u === 'ug' || u === 'mcg') return value / 1000;
    return value; // unrecognized unit — pass through rather than guess
  }

  function extractNutrients(foodNutrients) {
    const out = { energy: null, protein: null, fat: null, carbs: null, methionine: null };
    (foodNutrients || []).forEach(fn => {
      const number = fn.nutrientNumber !== undefined ? fn.nutrientNumber : (fn.nutrient && fn.nutrient.number);
      if (number === undefined || number === null) return;
      const value = fn.value !== undefined ? fn.value : (fn.amount !== undefined ? fn.amount : null);
      const unit = fn.unitName !== undefined ? fn.unitName : (fn.nutrient && fn.nutrient.unitName);
      for (const key in NUTRIENT_NUMBERS) {
        if (String(number) === NUTRIENT_NUMBERS[key]) {
          out[key] = key === 'methionine' ? toMg(value, unit) : value;
        }
      }
    });
    return out;
  }

  // Every nutrient USDA returns, not just the 5 core ones — used for the
  // "Full Nutrition Profile" view. Per 100g, matching extractNutrients.
  function extractFullNutrients(foodNutrients) {
    const list = [];
    (foodNutrients || []).forEach(fn => {
      const name = fn.nutrientName || (fn.nutrient && fn.nutrient.name);
      const unit = fn.unitName || (fn.nutrient && fn.nutrient.unitName);
      const value = fn.value !== undefined ? fn.value : (fn.amount !== undefined ? fn.amount : null);
      if (!name || value === null || value <= 0) return;
      list.push({ name, value, unit: unit || '' });
    });
    return list;
  }

  async function searchFoods(query, pageSize) {
    const data = await fetchWithRotation(key =>
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=${pageSize || 15}`
    );
    return (data.foods || []).map(f => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      brandOwner: f.brandOwner || null,
      nutrients: extractNutrients(f.foodNutrients),
      fullNutrients: extractFullNutrients(f.foodNutrients)
    }));
  }

  async function getFoodDetail(fdcId) {
    const data = await fetchWithRotation(key =>
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${key}`
    );
    return {
      fdcId: data.fdcId,
      description: data.description,
      dataType: data.dataType,
      nutrients: extractNutrients(data.foodNutrients),
      fullNutrients: extractFullNutrients(data.foodNutrients)
    };
  }

  return { searchFoods, getFoodDetail, NUTRIENT_NUMBERS };
})();
