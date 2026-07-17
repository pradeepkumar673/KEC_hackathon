import WorkoutSession from '../models/WorkoutSession.js';
import { EXERCISE_MUSCLE_MAP } from '../config/exerciseMuscleMap.js';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

// @route GET /api/progress/weekly-comparison (protected)
export const getWeeklyComparison = async (req, res) => {
  try {
    const thisWeekStart = daysAgo(7);
    const lastWeekStart = daysAgo(14);

    const sessions = await WorkoutSession.find({
      user: req.user._id,
      createdAt: { $gte: lastWeekStart },
    }).sort({ createdAt: 1 });

    const summarize = (list) => {
      const byExercise = {};
      let totalReps = 0;
      list.forEach((s) => {
        byExercise[s.exerciseType] = (byExercise[s.exerciseType] || 0) + s.reps;
        totalReps += s.reps;
      });
      return { byExercise, totalReps };
    };

    const thisWeek = summarize(sessions.filter((s) => s.createdAt >= thisWeekStart));
    const lastWeek = summarize(sessions.filter((s) => s.createdAt >= lastWeekStart && s.createdAt < thisWeekStart));

    const exerciseTypes = new Set([...Object.keys(thisWeek.byExercise), ...Object.keys(lastWeek.byExercise)]);
    const byExercise = {};
    exerciseTypes.forEach((type) => {
      const current = thisWeek.byExercise[type] || 0;
      const previous = lastWeek.byExercise[type] || 0;
      const changePct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
      byExercise[type] = { current, previous, changePct };
    });

    const totalChangePct =
      lastWeek.totalReps === 0
        ? (thisWeek.totalReps > 0 ? 100 : 0)
        : Math.round(((thisWeek.totalReps - lastWeek.totalReps) / lastWeek.totalReps) * 100);

    res.json({ thisWeekTotal: thisWeek.totalReps, lastWeekTotal: lastWeek.totalReps, totalChangePct, byExercise });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build weekly comparison', error: error.message });
  }
};

// @route GET /api/progress/calorie-trend?days=14 (protected)
export const getCalorieTrend = async (req, res) => {
  try {
    const days = Math.min(60, parseInt(req.query.days, 10) || 14);
    const since = daysAgo(days - 1);

    const sessions = await WorkoutSession.find({ user: req.user._id, createdAt: { $gte: since } }).select('calories createdAt');

    const byDate = {};
    sessions.forEach((s) => {
      const key = dateKey(s.createdAt);
      byDate[key] = (byDate[key] || 0) + s.calories;
    });

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dateKey(daysAgo(i));
      series.push({ date: key, calories: Math.round((byDate[key] || 0) * 10) / 10 });
    }

    res.json({ series });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build calorie trend', error: error.message });
  }
};

// @route GET /api/progress/form-trend?days=14 (protected)
export const getFormTrend = async (req, res) => {
  try {
    const days = Math.min(60, parseInt(req.query.days, 10) || 14);
    const since = daysAgo(days - 1);

    const sessions = await WorkoutSession.find({
      user: req.user._id,
      createdAt: { $gte: since },
      formScore: { $ne: null },
    }).select('formScore createdAt');

    const byDate = {};
    sessions.forEach((s) => {
      const key = dateKey(s.createdAt);
      (byDate[key] ||= []).push(s.formScore);
    });

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = dateKey(daysAgo(i));
      const scores = byDate[key];
      const avg = scores ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      series.push({ date: key, formScore: avg });
    }

    res.json({ series });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build form-score trend', error: error.message });
  }
};

// @route GET /api/progress/muscle-heatmap?days=7 (protected)
export const getMuscleHeatmap = async (req, res) => {
  try {
    const days = Math.min(30, parseInt(req.query.days, 10) || 7);
    const since = daysAgo(days - 1);

    const sessions = await WorkoutSession.find({ user: req.user._id, createdAt: { $gte: since } }).select('exerciseType reps');

    const volume = {};
    sessions.forEach((s) => {
      const mapping = EXERCISE_MUSCLE_MAP[s.exerciseType];
      if (!mapping) return;
      mapping.primary.forEach((m) => { volume[m] = (volume[m] || 0) + s.reps * 1.0; });
      mapping.secondary.forEach((m) => { volume[m] = (volume[m] || 0) + s.reps * 0.5; });
    });

    const max = Math.max(1, ...Object.values(volume));
    const heatmap = {};
    Object.entries(volume).forEach(([muscle, v]) => { heatmap[muscle] = Math.round((v / max) * 100); });

    res.json({ days, heatmap, rawVolume: volume });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build muscle heatmap', error: error.message });
  }
};
