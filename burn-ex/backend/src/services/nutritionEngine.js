// Mifflin-St Jeor BMR, standard activity multipliers, goal-based calorie adjustment.
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS = {
  weight_loss: -500,
  muscle_gain: 300,
  endurance: 0,
  general_fitness: 0,
};

export const calculateBMR = ({ weightKg, heightCm, age, gender }) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
};

export const calculateTDEE = ({ bmr, activityLevel }) => {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
};

export const calculateCalorieGoal = ({ tdee, goal }) => {
  const adjustment = GOAL_ADJUSTMENTS[goal] ?? 0;
  return Math.max(1200, Math.round(tdee + adjustment)); // never suggest below 1200 kcal
};
