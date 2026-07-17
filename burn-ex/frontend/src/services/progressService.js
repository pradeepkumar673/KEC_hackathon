import api from './api';

export const fetchWeeklyComparison = async () => api.get('/api/progress/weekly-comparison');
export const fetchCalorieTrend = async (days = 14) => api.get(`/api/progress/calorie-trend?days=${days}`);
export const fetchFormTrend = async (days = 14) => api.get(`/api/progress/form-trend?days=${days}`);
export const fetchMuscleHeatmap = async (days = 7) => api.get(`/api/progress/muscle-heatmap?days=${days}`);
