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
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
};

export const calculateTDEE = (bmr, activityLevel) => {
  if (!bmr) return null;
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2));
};

export const calculateCalorieGoal = (tdee, goal) => {
  if (!tdee) return null;
  return Math.max(1200, Math.round(tdee + (GOAL_ADJUSTMENTS[goal] ?? 0)));
};

export const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very active (physical job + training)',
};

export const GOAL_LABELS = {
  weight_loss: 'Weight loss',
  muscle_gain: 'Muscle gain',
  endurance: 'Endurance',
  general_fitness: 'General fitness',
};
