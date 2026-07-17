import METValue from '../models/METValue.js';
import calorieRegressionModel from './calorieRegressionModel.js';

const FALLBACK_MET = {
  pushup: 8.0,
  squat: 5.0,
};

/**
 * Hybrid calorie calculation: MET-based physiological baseline (from DB),
 * adjusted by a learned multiplier reflecting pace and form quality.
 */
export const calculateCalories = async ({
  exerciseType,
  weightKg,
  durationSeconds,
  reps,
  avgFormScore,
}) => {
  const metDoc = await METValue.findOne({ exerciseType });
  const met = metDoc?.met ?? FALLBACK_MET[exerciseType] ?? 5.0;

  const durationHours = durationSeconds / 3600;
  const baseCalories = met * weightKg * durationHours;

  const durationMinutes = durationSeconds / 60;
  const repsPerMinute = durationMinutes > 0 ? reps / durationMinutes : 0;

  const mlMultiplier = calorieRegressionModel.predict({
    repsPerMinute,
    avgFormScore: avgFormScore ?? 70,
  });

  const finalCalories = baseCalories * mlMultiplier;

  return {
    met,
    baseCalories: Math.round(baseCalories * 100) / 100,
    mlMultiplier: Math.round(mlMultiplier * 1000) / 1000,
    calories: Math.round(finalCalories * 100) / 100,
  };
};
