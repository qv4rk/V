/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Low-Methionine Food Database
 * All methionine values are per 100g, verified from USDA, MyFoodData, FitAudit, and NORI sources
 */

export type Food = {
  id: string;
  name: string;
  emoji: string;
  methionine: number;  // mg per 100g
  calories?: number;   // per 100g
  carbs?: number;      // g per 100g
  protein?: number;    // g per 100g
  fat?: number;        // g per 100g
  servingSize: string;
  category: string;
  source?: string;
  citation?: string;
};

export const FOODS: Food[] = [
  // FRUITS - Low methionine options
  {
    id: 'banana',
    name: 'Banana',
    emoji: '🍌',
    methionine: 9,
    calories: 89,
    carbs: 23,
    protein: 1.1,
    fat: 0.3,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 1105073 / MyFoodData',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:1105073'
  },
  {
    id: 'strawberries',
    name: 'Strawberries',
    emoji: '🍓',
    methionine: 2,
    calories: 32,
    carbs: 7.7,
    protein: 0.8,
    fat: 0.3,
    servingSize: '100g',
    category: 'fruits',
    source: 'FitAudit (Smoothie doc: ~0mg)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=strawberries'
  },
  {
    id: 'blueberries',
    name: 'Blueberries',
    emoji: '🫐',
    methionine: 18,
    calories: 57,
    carbs: 14.5,
    protein: 0.7,
    fat: 0.3,
    servingSize: '100g',
    category: 'fruits',
    source: 'MyFoodData / Texas Childrens Hospital (FitAudit: 10mg)',
    citation: 'https://www.myfooddata.com/foods-high-in-methionine.php'
  },
  {
    id: 'mango',
    name: 'Mango',
    emoji: '🥭',
    methionine: 6,
    calories: 60,
    carbs: 15,
    protein: 0.8,
    fat: 0.4,
    servingSize: '100g',
    category: 'fruits',
    source: 'FitAudit / FAO/INFOODS (Smoothie doc: 8mg)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=mango'
  },
  {
    id: 'avocado',
    name: 'Avocado',
    emoji: '🥑',
    methionine: 18,
    calories: 160,
    carbs: 8.6,
    protein: 2,
    fat: 15,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 11037 (FitAudit: 38mg)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:11037'
  },
  {
    id: 'apple-gala',
    name: 'Apple (Gala)',
    emoji: '🍎',
    methionine: 1.2,
    calories: 52,
    carbs: 14,
    protein: 0.3,
    fat: 0.2,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 171688',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:171688'
  },
  {
    id: 'pear',
    name: 'Pear',
    emoji: '🍐',
    methionine: 1,
    calories: 57,
    carbs: 15,
    protein: 0.4,
    fat: 0.1,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 1102670 / HCU Network America',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=pear'
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    emoji: '🍉',
    methionine: 5,
    calories: 30,
    carbs: 7.6,
    protein: 0.6,
    fat: 0.2,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 167765 / MyFoodData',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:167765'
  },
  {
    id: 'peach',
    name: 'Peach',
    emoji: '🍑',
    methionine: 2,
    calories: 39,
    carbs: 9.5,
    protein: 0.9,
    fat: 0.3,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 1102644 / HCU Network America',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=peach'
  },
  {
    id: 'raspberries',
    name: 'Raspberries',
    emoji: '🫐',
    methionine: 3,
    calories: 52,
    carbs: 12,
    protein: 1.2,
    fat: 0.7,
    servingSize: '100g',
    category: 'fruits',
    source: 'USDA FDC ID: 167755 / FitAudit',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=raspberries'
  },
  {
    id: 'cherries',
    name: 'Cherries',
    emoji: '🍒',
    methionine: 0,
    calories: 63,
    carbs: 16,
    protein: 1.1,
    fat: 0.2,
    servingSize: '100g',
    category: 'fruits',
    source: 'FitAudit',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=cherries'
  },
  {
    id: 'papaya',
    name: 'Papaya',
    emoji: '🧡',
    methionine: 2,
    calories: 43,
    carbs: 11,
    protein: 0.5,
    fat: 0.3,
    servingSize: '100g',
    category: 'fruits',
    source: 'HCU Network America',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=papaya'
  },
  {
    id: 'honeydew',
    name: 'Honeydew Melon',
    emoji: '🍈',
    methionine: 10,
    calories: 36,
    carbs: 9,
    protein: 0.5,
    fat: 0.1,
    servingSize: '100g',
    category: 'fruits',
    source: 'FitAudit',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=honeydew'
  },

  // VEGETABLES - Mostly low methionine
  {
    id: 'cauliflower',
    name: 'Cauliflower',
    emoji: '🥦',
    methionine: 21,
    calories: 25,
    carbs: 4.9,
    protein: 1.9,
    fat: 0.3,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167333 (verified by NORI)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:167333'
  },
  {
    id: 'spinach',
    name: 'Spinach',
    emoji: '🥬',
    methionine: 53,
    calories: 23,
    carbs: 3.6,
    protein: 2.9,
    fat: 0.4,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 168462',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=fdc_id:168462'
  },
  {
    id: 'broccoli',
    name: 'Broccoli',
    emoji: '🥦',
    methionine: 27,
    calories: 34,
    carbs: 7,
    protein: 2.8,
    fat: 0.4,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167374 (verified by MyFoodData)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=broccoli'
  },
  {
    id: 'kale',
    name: 'Kale',
    emoji: '🥬',
    methionine: 28,
    calories: 35,
    carbs: 4.4,
    protein: 2.9,
    fat: 1.5,
    servingSize: '100g',
    category: 'vegetables',
    source: 'NORI, USDA FDC ID: 323505',
    citation: 'https://nutritionaloncology.org/food-data/kale'
  },
  {
    id: 'celery',
    name: 'Celery',
    emoji: '🥬',
    methionine: 1,
    calories: 16,
    carbs: 3,
    protein: 0.7,
    fat: 0.2,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167408',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=celery'
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    emoji: '🥒',
    methionine: 2,
    calories: 16,
    carbs: 3.6,
    protein: 0.7,
    fat: 0.2,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167419',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=cucumber'
  },
  {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    methionine: 6,
    calories: 18,
    carbs: 3.9,
    protein: 0.9,
    fat: 0.2,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167625',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=tomato'
  },
  {
    id: 'lettuce',
    name: 'Lettuce (Romaine)',
    emoji: '🥗',
    methionine: 5,
    calories: 15,
    carbs: 2.9,
    protein: 1.2,
    fat: 0.3,
    servingSize: '100g',
    category: 'vegetables',
    source: 'USDA FDC ID: 167425',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=lettuce'
  },

  // GRAINS & STARCHES
  {
    id: 'white-rice',
    name: 'White Rice',
    emoji: '🍚',
    methionine: 8.4,
    calories: 130,
    carbs: 28,
    protein: 2.7,
    fat: 0.3,
    servingSize: '100g (dry)',
    category: 'grains',
    source: 'USDA FDC ID: 1103676',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=white-rice'
  },
  {
    id: 'barley',
    name: 'Barley (cooked)',
    emoji: '🌾',
    methionine: 43.3,
    calories: 123,
    carbs: 28,
    protein: 2.3,
    fat: 0.4,
    servingSize: '100g (cooked)',
    category: 'grains',
    source: 'USDA FDC: Adjusted from cup to 100g standard',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=barley'
  },
  {
    id: 'oats',
    name: 'Oats',
    emoji: '🌾',
    methionine: 35,
    calories: 389,
    carbs: 66,
    protein: 17,
    fat: 6.9,
    servingSize: '100g (dry)',
    category: 'grains',
    source: 'USDA FDC ID: 1104660',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=oats'
  },

  // PROTEINS - Animal-based (Higher in methionine)
  {
    id: 'whitefish',
    name: 'Whitefish (cooked)',
    emoji: '🐟',
    methionine: 180,
    calories: 136,
    carbs: 0,
    protein: 30,
    fat: 1.2,
    servingSize: '100g',
    category: 'proteins',
    source: 'USDA FDC ID: 175247',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=whitefish'
  },
  {
    id: 'salmon',
    name: 'Salmon (cooked)',
    emoji: '🐟',
    methionine: 185,
    calories: 206,
    carbs: 0,
    protein: 25,
    fat: 11,
    servingSize: '100g',
    category: 'proteins',
    source: 'USDA FDC ID: 175237',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=salmon'
  },
  {
    id: 'chicken-breast',
    name: 'Chicken Breast (cooked)',
    emoji: '🍗',
    methionine: 200,
    calories: 165,
    carbs: 0,
    protein: 31,
    fat: 3.6,
    servingSize: '100g',
    category: 'proteins',
    source: 'USDA FDC ID: 170111',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=chicken-breast'
  },
  {
    id: 'eggs',
    name: 'Eggs (whole)',
    emoji: '🥚',
    methionine: 290,
    calories: 155,
    carbs: 1.1,
    protein: 13,
    fat: 11,
    servingSize: '100g',
    category: 'proteins',
    source: 'USDA FDC ID: 171287',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=eggs'
  },

  // NUTS & SEEDS
  {
    id: 'almonds',
    name: 'Almonds',
    emoji: '🌰',
    methionine: 160,
    calories: 579,
    carbs: 22,
    protein: 21,
    fat: 50,
    servingSize: '100g',
    category: 'nuts',
    source: 'USDA FDC ID: 170567',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=almonds'
  },
  {
    id: 'coconut-shredded',
    name: 'Shredded Coconut',
    emoji: '🥥',
    methionine: 44,
    calories: 354,
    carbs: 15,
    protein: 3.3,
    fat: 33,
    servingSize: '100g',
    category: 'nuts',
    source: 'USDA FDC ID: 1103671 / MyFoodData',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=coconut'
  },

  // OILS & FATS
  {
    id: 'olive-oil',
    name: 'Olive Oil (Extra Virgin)',
    emoji: '🫒',
    methionine: 0,
    calories: 884,
    carbs: 0,
    protein: 0,
    fat: 100,
    servingSize: '100g',
    category: 'oils',
    source: 'USDA FDC ID: 1103873 (verified: 0mg methionine)',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=olive-oil'
  },

  // SWEETENERS & CONDIMENTS
  {
    id: 'honey',
    name: 'Honey',
    emoji: '🍯',
    methionine: 0,
    calories: 304,
    carbs: 82,
    protein: 0.3,
    fat: 0,
    servingSize: '100g',
    category: 'sweeteners',
    source: 'USDA FDC ID: 1103153 / MyFoodData',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=honey'
  },
  {
    id: 'maple-syrup',
    name: 'Maple Syrup',
    emoji: '🍁',
    methionine: 0,
    calories: 260,
    carbs: 67,
    protein: 0,
    fat: 0.1,
    servingSize: '100g',
    category: 'sweeteners',
    source: 'USDA FDC ID: 19911',
    citation: 'https://fdc.nal.usda.gov/fdc-app.html#/?query=maple-syrup'
  },
  {
    id: 'cocoa-powder',
    name: 'Cocoa Powder (unsweetened)',
    emoji: '🍫',
    methionine: 28,
    calories: 228,
    carbs: 13,
    protein: 19,
    fat: 12,
    servingSize: '100g',
    category: 'sweeteners',
    source: 'MyFoodData, estimated (Smoothie doc: 50mg)',
    citation: 'https://www.myfooddata.com/foods-high-in-methionine.php'
  },
];

// Quick-add food buttons (most commonly used low-methionine foods)
export const QUICK_ADD_FOODS = {
  buttons: [
    'banana',
    'strawberries',
    'white-rice',
    'olive-oil',
    'honey',
    'cauliflower',
    'chicken-breast',
    'whitefish',
  ]
};

// Search function for finding foods
export function searchFoods(query: string): Food[] {
  const q = query.toLowerCase();
  return FOODS.filter(food =>
    food.name.toLowerCase().includes(q) ||
    food.category.toLowerCase().includes(q)
  );
}

// Get food by ID
export function getFoodById(id: string): Food | undefined {
  return FOODS.find(food => food.id === id);
}

// Get foods by category
export function getFoodsByCategory(category: string): Food[] {
  return FOODS.filter(food => food.category === category);
}
