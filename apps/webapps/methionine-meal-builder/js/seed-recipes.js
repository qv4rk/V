// Starter recipes built from real per-serving USDA-adjacent nutrition data
// gathered during app planning (not estimated). Recipes with an `items`
// array have verified per-ingredient data ([name, grams, calories, fat_g,
// carbs_g, methionine_mg] per portion); "Berry Blast Smoothie" only ever
// had a verified combined total, not a per-ingredient split, so it's
// stored as `ingredients` (display only) + `totals` rather than inventing
// numbers for blueberries and strawberries individually.
// These are suggestions, not medical guidance — see the "About" panel.
window.SEED_RECIPES = [
  {
    name: 'Berry Blast Smoothie',
    ingredients: ['Blueberries (148g)', 'Strawberries (144g)'],
    totals: { cal: 472, fat: 23, carbs: 65, met: 9.4 }
  },
  {
    name: 'Tropical Sunrise Bowl',
    items: [
      ['Mango chunks', 165, 99, 0.6, 25, 23],
      ['Pineapple chunks', 165, 82, 0.2, 22, 20],
      ['Kiwi, sliced (1/2 cup)', 90, 55, 0.45, 13, 21.5]
    ]
  },
  {
    name: 'Coconut Melon Cooler',
    items: [
      ['Cantaloupe, chunks', 160, 54, 0.3, 13, 29],
      ['Honeydew, chunks', 170, 61, 0.2, 15, 27],
      ['Light coconut milk (1/2 cup)', 120, 84, 8, 3.5, 9.5]
    ]
  },
  {
    name: 'Citrus Berry Refresher',
    items: [
      ['Grapefruit sections', 230, 97, 0.3, 25, 12],
      ['Raspberries', 123, 64, 0.8, 15, 25],
      ['Lime juice (2 tbsp)', 30, 7.5, 0.025, 2.5, 0]
    ]
  }
];
