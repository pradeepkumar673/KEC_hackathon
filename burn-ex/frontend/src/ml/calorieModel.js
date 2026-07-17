/**
 * Calorie Multiplier Predictor
 * Uses a pretrained 3-layer neural network to predict the calorie multiplier
 * based on weight, reps/min, form score, MET, and duration.
 * 
 * Model files must be placed at:
 * - frontend/public/models/calorie_model/model.json
 * - frontend/public/models/calorie_model/scaler.json
 * - frontend/public/models/calorie_model/group1-shard1of1.bin
 * 
 * Download links for model files:
 * - model.json: (copy from this file)
 * - scaler.json: (copy from this file)
 * - group1-shard1of1.bin: (copy from project or run generate_models.py)
 */

import * as tf from '@tensorflow/tfjs';

let model = null;
let scaler = null;
let loadingPromise = null;

const MODEL_PATH = '/models/calorie_model/model.json';
const SCALER_PATH = '/models/calorie_model/scaler.json';

/**
 * Load the calorie model with caching and deduplication
 */
export const loadCalorieModel = async () => {
  if (model && scaler) return { model, scaler };
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const [loadedModel, scalerRes] = await Promise.all([
        tf.loadLayersModel(MODEL_PATH),
        fetch(SCALER_PATH).then(r => r.json())
      ]);
      model = loadedModel;
      scaler = scalerRes;
      console.log('✅ Calorie model loaded successfully');
      return { model, scaler };
    } catch (e) {
      console.warn('⚠️ Calorie model not loaded, using fallback', e);
      return null;
    }
  })();

  return loadingPromise;
};

/**
 * Predict the calorie multiplier from user metrics
 * @param {Object} features - { weightKg, repsPerMinute, avgFormScore, met, durationHours }
 * @returns {Promise<number>} - multiplier between 0.8 and 1.3
 */
export const predictMultiplier = async (features) => {
  const { weightKg, repsPerMinute, avgFormScore, met, durationHours } = features;

  // --- FALLBACK: linear approximation if model is not available ---
  const fallback = () => {
    const base = 1.0 + 0.01 * repsPerMinute + 0.002 * (avgFormScore - 70);
    return Math.min(1.3, Math.max(0.8, base));
  };

  const data = await loadCalorieModel();
  if (!data) return fallback();

  try {
    const { model, scaler } = data;
    const raw = [weightKg, repsPerMinute, avgFormScore, met, durationHours];
    const normalized = raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
    const input = tf.tensor2d([normalized]);
    const output = model.predict(input);
    const scaled = output.dataSync()[0];
    // Denormalize from [0,1] to [0.8, 1.3]
    const multiplier = 0.8 + scaled * 0.5;
    input.dispose();
    output.dispose();
    return Math.min(1.3, Math.max(0.8, multiplier));
  } catch (e) {
    console.warn('⚠️ Calorie model inference failed, using fallback', e);
    return fallback();
  }
};
