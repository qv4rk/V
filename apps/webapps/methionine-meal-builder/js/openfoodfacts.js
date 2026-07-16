window.OpenFoodFacts = (function () {
  'use strict';

  // Fallback barcode source for when USDA has no match — USDA's Branded
  // Foods data only covers products a manufacturer specifically
  // submitted a nutrition label for, while Open Food Facts is a
  // crowd-sourced, free, no-key-required database covering millions of
  // real-world UPCs (store brands, regional products, etc). Its data is
  // less consistently verified than USDA's, and it essentially never
  // carries amino-acid (methionine) values, so anything sourced from
  // here always falls through to the app's normal protein-share
  // estimate rather than ever claiming a measured methionine number.
  async function lookupBarcode(code) {
    const digits = (code || '').replace(/\D/g, '');
    if (!digits) return null;
    let res;
    try {
      res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${digits}.json?fields=product_name,brands,nutriments,code`);
    } catch (e) {
      return null;
    }
    if (!res.ok) return null;
    let data;
    try { data = await res.json(); } catch (e) { return null; }
    if (!data || data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments || {};
    const num = v => (typeof v === 'number' ? v : null);

    return {
      fdcId: null,
      description: p.product_name || `Barcode ${digits}`,
      dataType: 'OpenFoodFacts',
      brandOwner: p.brands || null,
      nutrients: {
        energy: num(n['energy-kcal_100g']),
        protein: num(n['proteins_100g']),
        fat: num(n['fat_100g']),
        carbs: num(n['carbohydrates_100g']),
        methionine: null // essentially never present in OFF data
      },
      fullNutrients: [],
      sourceUrl: `https://world.openfoodfacts.org/product/${digits}`
    };
  }

  return { lookupBarcode };
})();
