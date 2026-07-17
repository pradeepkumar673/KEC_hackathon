import api from './api.js';

export const fetchAiStatus = () => api.get('/api/ai/status');

export const analyzeFoodPhoto = (imageBase64) =>
  api.post('/api/ai/nutrition/analyze-photo', { imageBase64 });

export const fetchAiNutritionSuggestions = () =>
  api.get('/api/ai/nutrition/suggestions');

export const fetchWorkoutSummary = (payload) =>
  api.post('/api/ai/workout/summary', payload);

export const fetchFormTip = (payload) =>
  api.post('/api/ai/workout/form-tip', payload);
