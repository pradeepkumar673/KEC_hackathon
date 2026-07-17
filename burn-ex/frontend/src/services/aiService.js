import api from './api.js';

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

/** @returns {Promise<{ groq: boolean, huggingface: boolean }>} */
export const fetchAiStatus = () =>
  withTimeout(api.get('/api/ai/status'), 8000, { groq: false, huggingface: false });

/**
 * HF food vision — returns empty predictions + fallback flag instead of throwing
 * so the UI can switch to MobileNet without a hard error.
 */
export const analyzeFoodPhoto = async (imageBase64) => {
  try {
    const result = await withTimeout(
      api.post('/api/ai/nutrition/analyze-photo', { imageBase64 }),
      55000,
      { fallback: true, predictions: [], message: 'HF request timed out' }
    );

    if (result?.fallback || !result?.predictions?.length) {
      return {
        source: 'fallback',
        predictions: [],
        fallback: true,
        message: result?.message || 'No predictions from server',
      };
    }
    return {
      source: result.source || 'huggingface',
      predictions: result.predictions ?? [],
      fallback: false,
    };
  } catch (err) {
    const fallback =
      err.status === 502 ||
      err.status === 503 ||
      err.data?.fallback === true ||
      err.offline;

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

/** Post-workout Groq summary — never throws; returns fallback text on failure. */
export const fetchWorkoutSummary = async (payload) => {
  try {
    return await withTimeout(
      api.post('/api/ai/workout/summary', payload),
      35000,
      {
        summary: `Great work — ${payload.reps ?? 0} reps on ${payload.exerciseLabel || 'your exercise'}. Rest and hydrate.`,
        aiPowered: false,
      }
    );
  } catch (err) {
    return {
      summary: `Great work — ${payload.reps ?? 0} reps completed. Rest, hydrate, and come back strong.`,
      aiPowered: false,
      error: err.message,
    };
  }
};

/** Live form tip — fire-and-forget; returns null tip on failure or timeout. */
export const fetchFormTip = async (payload) =>
  withTimeout(
    api.post('/api/ai/workout/form-tip', payload).catch(() => ({ tip: null, aiPowered: false })),
    10000,
    { tip: null, aiPowered: false }
  );
