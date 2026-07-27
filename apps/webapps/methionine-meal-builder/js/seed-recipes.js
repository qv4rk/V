// Starter recipes carry ONLY ingredient names and USDA FDC IDs — no
// calorie/fat/carb/methionine numbers are stored here. Every number a
// user sees for these recipes is fetched live from USDA FoodData Central
// at load time (see computeItemTotals/loadSeedRecipe in app.js), so there
// is nothing in this file that can silently drift from the source or get
// mislabeled "verified" without an actual live check behind it.
window.SEED_RECIPES = [
  {
    name: 'Berry Bowl',
    items: [
      { name: 'Blueberries, raw', fdcId: 171711, grams: 148 },
      { name: 'Strawberries, raw', fdcId: 167762, grams: 144 }
    ]
  },
  {
    name: 'Tropical Sunrise Bowl',
    items: [
      { name: 'Mango, raw', fdcId: 169910, grams: 165 },
      { name: 'Pineapple, raw', fdcId: 169124, grams: 165 },
      { name: 'Kiwifruit, green, raw', fdcId: 168153, grams: 90 }
    ]
  },
  {
    name: 'Melon Cooler',
    items: [
      { name: 'Cantaloupe, raw', fdcId: 169092, grams: 160 },
      { name: 'Honeydew melon, raw', fdcId: 169911, grams: 170 }
    ]
  },
  {
    name: 'Citrus Berry Refresher',
    items: [
      { name: 'Raspberries, raw', fdcId: 167755, grams: 123 }
    ]
  }
];
