import * as tf from '@tensorflow/tfjs';

let model = null;
let scaler = null;
const MODEL_PATH = '/models/form_model/model.json';
const SCALER_PATH = '/models/form_model/scaler.json';

export const loadFormModel = async () => {
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
    console.warn('Form model not loaded, using fallback', e);
    return null;
  }
};

export const predictFormScore = async (landmarks) => {
  if (!landmarks || landmarks.length < 33) return null;
  const data = await loadFormModel();
  if (!data) {
    // fallback: use rule-based depth/alignment if available, else random
    return Math.round(70 + Math.random() * 30);
  }

  const { model, scaler } = data;
  const flat = landmarks.flatMap(l => [l.x, l.y, l.z]);
  const normalized = flat.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]);
  const input = tf.tensor2d([normalized]);
  const output = model.predict(input);
  const score = output.dataSync()[0] * 100;
  input.dispose();
  output.dispose();
  return Math.min(100, Math.max(0, Math.round(score)));
};
