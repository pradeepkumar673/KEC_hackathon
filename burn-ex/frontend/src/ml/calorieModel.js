/**
 * Calorie Multiplier Predictor
 * Model files: /models/calorie_model/model.json, scaler.json, group1-shard1of1.bin
 */
import * as tf from '@tensorflow/tfjs';

let model = null;
let scaler = null;
let loadingPromise = null;

const MODEL_PATH = '/models/calorie_model/model.json';
const SCALER_PATH = '/models/calorie_model/scaler.json';

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
      console.log('✅ Calorie model loaded');
      return { model, scaler };
    } catch (e) {
      console.warn('⚠️ Calorie model not loaded, using fallback', e);
      return null;
    }
  })();
  return loadingPromise;
};

export const predictMultiplier = async (features) => {
  const { weightKg, repsPerMinute, avgFormScore, met, durationHours } = features;
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
    const multiplier = 0.8 + scaled * 0.5; // denormalize
    input.dispose();
    output.dispose();
    return Math.min(1.3, Math.max(0.8, multiplier));
  } catch (e) {
    console.warn('⚠️ Calorie inference failed', e);
    return fallback();
  }
};
