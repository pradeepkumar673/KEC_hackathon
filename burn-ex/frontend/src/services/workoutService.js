import api from './api';

export const fetchMetValues = async () => {
  const { data } = await api.get('/workouts/met-values');
  return data; // { pushup: 8.0, squat: 5.0 }
};

export const saveWorkoutSession = async ({ exerciseType, reps, durationSeconds, formScore }) => {
  const { data } = await api.post('/workouts', { exerciseType, reps, durationSeconds, formScore });
  return data;
};

export const fetchWorkoutHistory = async (page = 1, limit = 20) => {
  const { data } = await api.get(`/workouts/history?page=${page}&limit=${limit}`);
  return data; // { sessions, pagination, summary }
};
