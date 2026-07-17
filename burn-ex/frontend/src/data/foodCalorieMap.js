const FOOD_CALORIE_MAP = {
  pizza: 285,
  cheeseburger: 550,
  hamburger: 350,
  'hot dog': 290,
  'ice cream': 210,
  banana: 105,
  orange: 62,
  strawberry: 4,
  pineapple: 82,
  broccoli: 55,
  cauliflower: 25,
  bagel: 245,
  pretzel: 340,
  'french loaf': 270,
  burrito: 445,
  guacamole: 150,
  carbonara: 425,
  espresso: 5,
  trifle: 300,
  meatloaf: 285,
  potpie: 400,
  consomme: 90,
  'mashed potato': 215,
  'head cabbage': 45,
  'bell pepper': 30,
  zucchini: 20,
  'butternut squash': 55,
  pomegranate: 105,
  fig: 37,
  'chocolate sauce': 150,
};

const DEFAULT_ESTIMATE = 250; // fallback when the recognized label has no mapping

// Typical plated portions. A photo has no reliable physical scale, so this is
// shown as a serving estimate rather than an exact measurement.
const FOOD_SERVING_GRAMS = {
  'fried rice': 200, 'chicken curry': 180, pho: 350, falafel: 120, ramen: 400,
  pizza: 150, burger: 220, sushi: 180, salad: 220, pasta: 250, spaghetti: 250,
  sandwich: 180, rice: 200, noodles: 250, soup: 300, chicken: 180, steak: 180,
  salmon: 170, banana: 120, apple: 180, orange: 150, fries: 150, default: 200,
};

export const estimateCaloriesForLabel = (label) => {
  const key = label.toLowerCase().replace(/_/g, ' ').trim();
  return FOOD_CALORIE_MAP[key] ?? DEFAULT_ESTIMATE;
};

export const estimateServingGrams = (label) => {
  const key = label.toLowerCase().replace(/[_-]/g, ' ').trim();
  const match = Object.keys(FOOD_SERVING_GRAMS).find((food) => food !== 'default' && key.includes(food));
  return FOOD_SERVING_GRAMS[match ?? 'default'];
};

export default FOOD_CALORIE_MAP;
