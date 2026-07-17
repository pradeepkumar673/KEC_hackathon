import asyncHandler from '../utils/asyncHandler.js';
import NutritionLog from '../models/NutritionLog.js';
import WorkoutSession from '../models/WorkoutSession.js';
import {
  generateNutritionSuggestions,
  generateWorkoutSummary,
  generateFormTip,
  isGroqConfigured,
} from '../services/groqService.js';
import { classifyFoodImage, isHfConfigured } from '../services/huggingfaceService.js';

const todayKey = () => new Date().toISOString().slice(0, 10);

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

// POST /api/ai/nutrition/analyze-photo  { imageBase64: "..." }
export const analyzeFoodPhoto = asyncHandler(async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    res.status(400);
    throw new Error('imageBase64 is required');
  }

  if (!isHfConfigured()) {
    res.status(503);
    throw new Error('Food vision service not configured (HF_API_TOKEN)');
  }

  const predictions = await classifyFoodImage(imageBase64);
  res.json({ source: 'huggingface', predictions });
});

// GET /api/ai/nutrition/suggestions — Groq-powered (falls back handled in nutrition route)
export const getAiNutritionSuggestions = asyncHandler(async (req, res) => {
  const date = todayKey();
  let log = await NutritionLog.findOne({ user: req.user._id, date });
  if (!log) {
    return res.json({ remaining: 0, suggestions: ['Log a meal to get AI nutrition advice.'], aiPowered: false });
  }

  const caloriesConsumed = log.entries.reduce((sum, e) => sum + e.calories, 0);
  const caloriesBurned = await caloriesBurnedToday(req.user._id, log.date);
  const remaining = log.calorieGoal + caloriesBurned - caloriesConsumed;

  if (!isGroqConfigured()) {
    return res.json({
      remaining,
      suggestions: [`You have about ${Math.round(remaining)} kcal left today.`],
      aiPowered: false,
    });
  }

  const groqTips = await generateNutritionSuggestions({
    name: req.user.name,
    goal: req.user.goal,
    remaining,
    calorieGoal: log.calorieGoal,
    caloriesConsumed,
    caloriesBurned,
    entries: log.entries,
  });

  res.json({
    remaining,
    suggestions: groqTips?.length ? groqTips : [`You have about ${Math.round(remaining)} kcal left today.`],
    aiPowered: Boolean(groqTips?.length),
  });
});

// POST /api/ai/workout/summary
export const postWorkoutSummary = asyncHandler(async (req, res) => {
  const {
    exerciseType,
    exerciseLabel,
    reps,
    durationSeconds,
    formScore,
    fatigueScore,
    injuryRisk,
    riskFactors,
  } = req.body;

  if (!isGroqConfigured()) {
    return res.json({
      summary: `Great work — ${reps || 0} reps on ${exerciseLabel || exerciseType || 'your exercise'}. Keep consistent form and recovery.`,
      aiPowered: false,
    });
  }

  const summary = await generateWorkoutSummary({
    exerciseLabel: exerciseLabel || exerciseType,
    reps: reps ?? 0,
    durationSeconds: durationSeconds ?? 0,
    formScore,
    fatigueScore: fatigueScore ?? 0,
    injuryRisk: injuryRisk ?? 0,
    riskFactors: riskFactors ?? [],
    userGoal: req.user.goal,
  });

  res.json({
    summary:
      summary ||
      `Solid session: ${reps} reps, form ${formScore ?? '—'}/100. Rest and hydrate.`,
    aiPowered: Boolean(summary),
  });
});

// POST /api/ai/workout/form-tip
export const postFormTip = asyncHandler(async (req, res) => {
  const { exerciseLabel, lastRepScore, formIssue, fatigueLevel } = req.body;

  if (!isGroqConfigured()) {
    return res.json({ tip: formIssue || 'Focus on controlled movement.', aiPowered: false });
  }

  const tip = await generateFormTip({
    exerciseLabel,
    lastRepScore,
    formIssue,
    fatigueLevel,
  });

  res.json({
    tip: tip || formIssue || 'Nice rep — stay tight through your core.',
    aiPowered: Boolean(tip),
  });
});

// GET /api/ai/status
export const getAiStatus = asyncHandler(async (_req, res) => {
  res.json({
    groq: isGroqConfigured(),
    huggingface: isHfConfigured(),
  });
});
