import NutritionLog from '../models/NutritionLog.js';
import WorkoutSession from '../models/WorkoutSession.js';
import { calculateBMR, calculateTDEE, calculateCalorieGoal } from '../services/nutritionEngine.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  generateNutritionSuggestions,
  isGroqConfigured,
} from '../services/groqService.js';

const todayKey = () => new Date().toISOString().slice(0, 10);

const buildGoals = (user) => {
  const bmr = calculateBMR({ weightKg: user.weight, heightCm: user.height, age: user.age, gender: user.gender });
  const tdee = calculateTDEE({ bmr, activityLevel: user.activityLevel });
  const calorieGoal = calculateCalorieGoal({ tdee, goal: user.goal });
  return { bmr, tdee, calorieGoal };
};

const getOrCreateTodayLog = async (user) => {
  const date = todayKey();
  let log = await NutritionLog.findOne({ user: user._id, date });
  if (!log) {
    log = await NutritionLog.create({ user: user._id, date, ...buildGoals(user), entries: [] });
  }
  return log;
};

const caloriesBurnedToday = async (userId, date) => {
  const agg = await WorkoutSession.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: new Date(`${date}T00:00:00.000Z`), $lte: new Date(`${date}T23:59:59.999Z`) },
      },
    },
    { $group: { _id: null, total: { $sum: '$calories' } } },
  ]);
  return agg[0]?.total ?? 0;
};

// @route GET /api/nutrition/goals (protected)
export const getGoals = asyncHandler(async (req, res) => {
  res.json(buildGoals(req.user));
});

// @route GET /api/nutrition/today (protected)
export const getToday = asyncHandler(async (req, res) => {
  const log = await getOrCreateTodayLog(req.user);
  const caloriesConsumed = log.entries.reduce((sum, e) => sum + e.calories, 0);
  const caloriesBurned = await caloriesBurnedToday(req.user._id, log.date);

  res.json({
    date: log.date,
    bmr: log.bmr,
    tdee: log.tdee,
    calorieGoal: log.calorieGoal,
    entries: log.entries,
    caloriesConsumed,
    caloriesBurned,
    remaining: log.calorieGoal + caloriesBurned - caloriesConsumed,
  });
});

// @route POST /api/nutrition/log (protected)  body: { label, calories, confidence?, source? }
export const logFood = asyncHandler(async (req, res) => {
  const { label, calories, confidence, source = 'manual' } = req.body;
  if (!label || calories === undefined) {
    res.status(400);
    throw new Error('label and calories are required');
  }

  const log = await getOrCreateTodayLog(req.user);
  log.entries.push({ label, calories, confidence, source, loggedAt: new Date() });
  await log.save();

  res.status(201).json(log);
});

// @route DELETE /api/nutrition/log/:entryIndex (protected)
export const deleteFoodEntry = asyncHandler(async (req, res) => {
  const log = await getOrCreateTodayLog(req.user);
  log.entries.splice(parseInt(req.params.entryIndex, 10), 1);
  await log.save();
  res.json(log);
});

// @route GET /api/nutrition/suggestions (protected) — rule-based fallback; prefer /api/ai/nutrition/suggestions for Groq
export const getSuggestions = asyncHandler(async (req, res) => {
  const log = await getOrCreateTodayLog(req.user);
  const caloriesConsumed = log.entries.reduce((sum, e) => sum + e.calories, 0);
  const caloriesBurned = await caloriesBurnedToday(req.user._id, log.date);
  const remaining = log.calorieGoal + caloriesBurned - caloriesConsumed;

  if (isGroqConfigured()) {
    const groqTips = await generateNutritionSuggestions({
      name: req.user.name,
      goal: req.user.goal,
      remaining,
      calorieGoal: log.calorieGoal,
      caloriesConsumed,
      caloriesBurned,
      entries: log.entries,
    });
    if (groqTips?.length) {
      return res.json({ remaining, suggestions: groqTips, aiPowered: true });
    }
  }

  res.json({
    remaining,
    suggestions: buildSuggestions({ remaining, calorieGoal: log.calorieGoal, entries: log.entries, goal: req.user.goal }),
    aiPowered: false,
  });
});

const buildSuggestions = ({ remaining, calorieGoal, entries, goal }) => {
  const messages = [];
  const pctRemaining = (remaining / calorieGoal) * 100;

  if (entries.length === 0) {
    return ["You haven't logged anything today — log a meal to get personalized suggestions."];
  }

  if (remaining < -100) {
    messages.push(`You're about ${Math.abs(Math.round(remaining))} kcal over budget today. A lighter dinner or a short walk can help offset it.`);
  } else if (pctRemaining > 40) {
    messages.push(`You have ${Math.round(remaining)} kcal left for today — room for a balanced dinner with lean protein and vegetables.`);
  } else if (remaining >= 0) {
    messages.push(`You're on track with ${Math.round(remaining)} kcal remaining — a light snack should keep you within goal.`);
  } else {
    messages.push("You're right at your calorie goal for today — nice consistency!");
  }

  if (goal === 'weight_loss' && remaining < 0) {
    messages.push('Since your goal is weight loss, prioritizing protein and fiber at your next meal can help you feel full for fewer calories.');
  }
  if (goal === 'muscle_gain' && remaining > 300) {
    messages.push('You have a calorie buffer left — a protein-rich snack (Greek yogurt, eggs, or a shake) supports muscle gain goals.');
  }

  return messages;
};
