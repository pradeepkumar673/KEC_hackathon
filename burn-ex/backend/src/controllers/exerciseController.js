import axios from 'axios';
import asyncHandler from '../utils/asyncHandler.js';

const FREE_EXERCISE_DB =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// In-memory cache to avoid re-fetching on every request
let exerciseCache = null;

const fetchExercises = async () => {
  if (exerciseCache) return exerciseCache;
  const response = await axios.get(FREE_EXERCISE_DB);
  exerciseCache = response.data;
  return exerciseCache;
};

// GET /api/exercises
export const getAllExercises = asyncHandler(async (req, res) => {
  const exercises = await fetchExercises();
  const { muscles, equipment, category, limit = 50, offset = 0 } = req.query;

  let filtered = [...exercises];

  if (muscles) {
    const muscleList = muscles.split(',').map((m) => m.trim().toLowerCase());
    filtered = filtered.filter((ex) =>
      muscleList.some(
        (m) =>
          ex.primaryMuscles?.map((p) => p.toLowerCase()).includes(m) ||
          ex.secondaryMuscles?.map((s) => s.toLowerCase()).includes(m)
      )
    );
  }

  if (equipment) {
    const equipList = equipment.split(',').map((e) => e.trim().toLowerCase());
    filtered = filtered.filter((ex) =>
      equipList.includes(ex.equipment?.toLowerCase())
    );
  }

  if (category) {
    filtered = filtered.filter(
      (ex) => ex.category?.toLowerCase() === category.toLowerCase()
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ total, exercises: paginated });
});

// GET /api/exercises/random/:count
export const getRandomExercises = asyncHandler(async (req, res) => {
  const exercises = await fetchExercises();
  const count = Math.min(Number(req.params.count) || 10, 50);
  const shuffled = [...exercises].sort(() => Math.random() - 0.5);
  res.json(shuffled.slice(0, count));
});

// GET /api/exercises/equipment
export const getEquipmentTypes = asyncHandler(async (req, res) => {
  const exercises = await fetchExercises();
  const types = [...new Set(exercises.map((e) => e.equipment).filter(Boolean))].sort();
  res.json(types);
});

// GET /api/exercises/muscles
export const getMuscleGroups = asyncHandler(async (req, res) => {
  const exercises = await fetchExercises();
  const primary = exercises.flatMap((e) => e.primaryMuscles || []);
  const secondary = exercises.flatMap((e) => e.secondaryMuscles || []);
  const muscles = [...new Set([...primary, ...secondary])].sort();
  res.json(muscles);
});

// GET /api/exercises/:id
export const getExerciseById = asyncHandler(async (req, res) => {
  const exercises = await fetchExercises();
  const exercise = exercises.find((e) => e.id === req.params.id);
  if (!exercise) {
    res.status(404);
    throw new Error('Exercise not found');
  }
  res.json(exercise);
});

// GET /api/health
export const healthCheck = (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
