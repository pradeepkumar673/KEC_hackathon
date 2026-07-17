import api from './api';

export const fetchNutritionGoals = async () => api.get('/api/nutrition/goals');
export const fetchTodayNutrition = async () => api.get('/api/nutrition/today');
export const logFoodEntry = async (entry) => api.post('/api/nutrition/log', entry);
export const deleteFoodEntry = async (entryIndex) => api.delete(`/api/nutrition/log/${entryIndex}`);
export const fetchSuggestions = async () => api.get('/api/nutrition/suggestions');
