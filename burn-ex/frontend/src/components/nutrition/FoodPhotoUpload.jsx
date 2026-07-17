import { useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { estimateCaloriesForLabel } from '../../data/foodCalorieMap';

let cachedModel = null; // module-level cache — download/warm up once per session

const loadModel = async () => {
  if (cachedModel) return cachedModel;
  await tf.ready();
  cachedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
  return cachedModel;
};

const FoodPhotoUpload = ({ onEstimate }) => {
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setPredictions([]);
    setPreviewUrl(URL.createObjectURL(file));

    requestAnimationFrame(async () => {
      try {
        setModelLoading(true);
        const model = await loadModel();
        setModelLoading(false);

        setClassifying(true);
        const img = imageRef.current;
        if (!img.complete) {
          await new Promise((resolve) => { img.onload = resolve; });
        }
        const results = await model.classify(img, 5);
        setPredictions(results);
      } catch (err) {
        setError('Could not classify this photo. Try a clearer, well-lit shot.');
      } finally {
        setModelLoading(false);
        setClassifying(false);
      }
    });
  }, []);

  const handleConfirm = (prediction) => {
    const label = prediction.className.split(',')[0];
    onEstimate({
      label,
      confidence: Math.round(prediction.probability * 100) / 100,
      calories: estimateCaloriesForLabel(label),
      source: 'photo',
    });
    setPredictions([]);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <p className="text-sm font-semibold mb-3">Log food from a photo</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="text-xs text-gray-400 mb-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                   file:border-0 file:bg-orange-500 file:text-white file:text-xs
                   hover:file:bg-orange-600 file:cursor-pointer"
      />

      {previewUrl && (
        <img
          ref={imageRef}
          src={previewUrl}
          alt="Food preview"
          crossOrigin="anonymous"
          className="w-full max-h-56 object-cover rounded-lg border border-gray-700 mb-3"
        />
      )}

      {modelLoading && <p className="text-xs text-gray-400">Loading MobileNetV2 (first time only)...</p>}
      {classifying && <p className="text-xs text-gray-400">Analyzing photo...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {predictions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Tap the closest match:</p>
          {predictions.map((p) => {
            const label = p.className.split(',')[0];
            return (
              <button
                key={p.className}
                onClick={() => handleConfirm(p)}
                className="w-full flex items-center justify-between bg-gray-900/60 hover:bg-gray-700
                           border border-gray-700 rounded-lg px-3 py-2 text-left transition"
              >
                <span className="text-sm capitalize">{label}</span>
                <span className="text-xs text-gray-400">
                  {Math.round(p.probability * 100)}% match · ~{estimateCaloriesForLabel(label)} kcal
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FoodPhotoUpload;
