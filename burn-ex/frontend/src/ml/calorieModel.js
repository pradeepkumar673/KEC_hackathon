import * as tf from '@tensorflow/tfjs';

let model = null;
let scaler = null;
const MODEL_PATH = '/models/calorie_model/model.json';
const SCALER_PATH = '/models/calorie_model/scaler.json';

export const loadCalorieModel = async () => {
  if (model && scaler) return { model, scaler };
  try {
    const [loadedModel, scalerRes] = await Promise.all([
      tf.loadLayersModel(MODEL_PATH),
      fetch(SCALER_PATH).then(r => r.json())
    ]);
    model = loadedModel;
    scaler = scalerRes;
    return { model, scaler };
  } catch (e) {
    console.warn('Calorie model not loaded, using fallback', e);
    return null;
  }
};

export const predictMultiplier = async (features) => {
  const data = await loadCalorieModel();
  if (!data) {
    // fallback linear
    const { repsPerMinute, avgFormScore } = features;
    return Math.min(1.3, Math.max(0.8, 1.0 + 0.01 * repsPerMinute + 0.002 * (avgFormScore - 70)));
  }

  const { model, scaler } = data;
  const { weightKg, repsPerMinute, avgFormScore, met, durationHours } = features;
  const raw = [weightKg, repsPerMinute, avgFormScore, met, durationHours];
  const normalized = raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
  const input = tf.tensor2d([normalized]);
  const output = model.predict(input);
  const scaled = output.dataSync()[0];
  const multiplier = 0.8 + scaled * 0.5;  // denormalize from [0,1] to [0.8,1.3]
  input.dispose();
  output.dispose();
  return Math.min(1.3, Math.max(0.8, multiplier));
};
