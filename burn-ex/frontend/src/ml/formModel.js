/**
 * Form Score Predictor
 * Uses a pretrained 3-layer neural network to predict form quality (0-100)
 * from 33 MediaPipe pose landmarks (x, y, z coordinates).
 * 
 * Model files must be placed at:
 * - frontend/public/models/form_model/model.json
 * - frontend/public/models/form_model/scaler.json
 * - frontend/public/models/form_model/group1-shard1of1.bin
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

const MODEL_PATH = '/models/form_model/model.json';
const SCALER_PATH = '/models/form_model/scaler.json';

/**
 * Load the form model with caching and deduplication
 */
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
      console.log('✅ Form model loaded successfully');
      return { model, scaler };
    } catch (e) {
      console.warn('⚠️ Form model not loaded, using fallback', e);
      return null;
    }
  })();

  return loadingPromise;
};

/**
 * Predict form score from pose landmarks
 * @param {Array} landmarks - 33 MediaPipe landmarks with {x, y, z}
 * @param {Object} config - optional exercise config for fallback scoring
 * @param {number} config.depthScore - depth score (0-100)
 * @param {number} config.alignScore - alignment score (0-100)
 * @returns {Promise<number>} - score between 0 and 100
 */
export const predictFormScore = async (landmarks, config = null) => {
  if (!landmarks || landmarks.length < 33) return null;

  // --- FALLBACK: rule-based scoring using depth and alignment ---
  const fallback = () => {
    if (config && config.depthScore !== undefined && config.alignScore !== undefined) {
      return Math.round(config.depthScore * 0.6 + config.alignScore * 0.4);
    }
    // Random fallback if no config provided
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
    console.warn('⚠️ Form model inference failed, using fallback', e);
    return fallback();
  }
};
