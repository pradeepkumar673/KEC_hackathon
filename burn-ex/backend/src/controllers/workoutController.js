import METValue from '../models/METValue.js';
import WorkoutSession from '../models/WorkoutSession.js';
import { calculateCalories } from '../services/calorieEngine.js';

const FALLBACK_MET = { pushup: 8.0, squat: 5.0 };

// @route GET /api/workouts/met-values
// Public — lets the frontend mirror MET numbers for a live estimate
export const getMetValues = async (req, res) => {
  try {
    const values = await METValue.find();
    const map = {};
    values.forEach((v) => {
      map[v.exerciseType] = v.met;
    });
    // fill in any missing exercise types with fallback so the client always has a number
    Object.entries(FALLBACK_MET).forEach(([key, val]) => {
      if (!(key in map)) map[key] = val;
    });
    res.json(map);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch MET values', error: error.message });
  }
};

// @route POST /api/workouts  (protected)
// body: { exerciseType, reps, durationSeconds, formScore }
export const saveWorkoutSession = async (req, res) => {
  try {
    const { exerciseType, reps, durationSeconds, formScore } = req.body;

    if (!exerciseType || reps === undefined || durationSeconds === undefined) {
      return res.status(400).json({ message: 'exerciseType, reps, and durationSeconds are required' });
    }

    const weightKg = req.user.weight;
    if (!weightKg) {
      return res.status(400).json({ message: 'User profile is missing weight; cannot estimate calories' });
    }

    const { met, mlMultiplier, calories } = await calculateCalories({
      exerciseType,
      weightKg,
      durationSeconds,
      reps,
      avgFormScore: formScore,
    });

    const session = await WorkoutSession.create({
      user: req.user._id,
      exerciseType,
      reps,
      durationSeconds,
      formScore,
      met,
      mlMultiplier,
      calories,
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Failed to save workout session', error: error.message });
  }
};

// @route GET /api/workouts/history  (protected)
// query: limit, page
export const getWorkoutHistory = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await WorkoutSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkoutSession.countDocuments({ user: req.user._id });

    const totals = await WorkoutSession.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$calories' },
          totalReps: { $sum: '$reps' },
          totalDurationSeconds: { $sum: '$durationSeconds' },
        },
      },
    ]);

    res.json({
      sessions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      summary: totals[0] ?? { totalCalories: 0, totalReps: 0, totalDurationSeconds: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch workout history', error: error.message });
  }
};
