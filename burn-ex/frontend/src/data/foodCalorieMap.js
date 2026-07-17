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

export const estimateCaloriesForLabel = (label) => {
  const key = label.toLowerCase().replace(/_/g, ' ').trim();
  return FOOD_CALORIE_MAP[key] ?? DEFAULT_ESTIMATE;
};

export default FOOD_CALORIE_MAP;
