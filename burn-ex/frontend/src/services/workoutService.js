import api from './api';

export const fetchMetValues = async () => {
  return api.get('/api/workouts/met-values');
};

export const saveWorkoutSession = async ({ exerciseType, reps, durationSeconds, formScore }) => {
  return api.post('/api/workouts', { exerciseType, reps, durationSeconds, formScore });
};

export const fetchWorkoutHistory = async (page = 1, limit = 20) => {
  return api.get(`/api/workouts/history?page=${page}&limit=${limit}`);
};
