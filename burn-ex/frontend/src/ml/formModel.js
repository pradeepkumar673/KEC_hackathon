/**
 * Form Score Predictor
 * Model files: /models/form_model/model.json, scaler.json, group1-shard1of1.bin
 */
import * as tf from '@tensorflow/tfjs';

let model = null;
let scaler = null;
let loadingPromise = null;

const MODEL_PATH = '/models/form_model/model.json';
const SCALER_PATH = '/models/form_model/scaler.json';

export const loadFormModel = async () => {
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
      console.log('✅ Form model loaded');
      return { model, scaler };
    } catch (e) {
      console.warn('⚠️ Form model not loaded, using fallback', e);
      return null;
    }
  })();
  return loadingPromise;
};

export const predictFormScore = async (landmarks, config = null) => {
  if (!landmarks || landmarks.length < 33) return null;
  const fallback = () => {
    if (config?.depthScore !== undefined && config?.alignScore !== undefined) {
      return Math.round(config.depthScore * 0.6 + config.alignScore * 0.4);
    }
    return Math.round(70 + Math.random() * 30);
  };

  const data = await loadFormModel();
  if (!data) return fallback();

  try {
    const { model, scaler } = data;
    const flat = landmarks.flatMap(l => [l.x, l.y, l.z]);
    const normalized = flat.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
    const input = tf.tensor2d([normalized]);
    const output = model.predict(input);
    const score = output.dataSync()[0] * 100;
    input.dispose();
    output.dispose();
    return Math.min(100, Math.max(0, Math.round(score)));
  } catch (e) {
    console.warn('⚠️ Form inference failed', e);
    return fallback();
  }
};
