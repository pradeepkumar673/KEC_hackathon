import api from './api.js';

/** @returns {Promise<{ groq: boolean, huggingface: boolean }>} */
export const fetchAiStatus = () => api.get('/api/ai/status');

/**
 * HF food vision — returns empty predictions + fallback flag instead of throwing
 * so the UI can switch to MobileNet without a hard error.
 */
export const analyzeFoodPhoto = async (imageBase64) => {
  try {
    const result = await api.post('/api/ai/nutrition/analyze-photo', { imageBase64 });
    return {
      source: result.source || 'huggingface',
      predictions: result.predictions ?? [],
      fallback: false,
    };
  } catch (err) {
    const fallback =
      err.status === 502 ||
      err.status === 503 ||
      err.data?.fallback === true;

    if (fallback) {
      return {
        source: 'fallback',
        predictions: [],
        fallback: true,
        message: err.message || 'Server vision unavailable',
      };
    }
    throw err;
  }
};

export const fetchAiNutritionSuggestions = () =>
  api.get('/api/ai/nutrition/suggestions');

/**
 * Post-workout Groq summary — never throws; returns fallback text on failure.
 */
export const fetchWorkoutSummary = async (payload) => {
  try {
    return await api.post('/api/ai/workout/summary', payload);
  } catch (err) {
    return {
      summary: `Great work — ${payload.reps ?? 0} reps completed. Rest, hydrate, and come back strong.`,
      aiPowered: false,
      error: err.message,
    };
  }
};

/**
 * Live form tip — fire-and-forget friendly; returns null tip on failure.
 */
export const fetchFormTip = async (payload) => {
  try {
    return await api.post('/api/ai/workout/form-tip', payload);
  } catch {
    return { tip: null, aiPowered: false };
  }
};
