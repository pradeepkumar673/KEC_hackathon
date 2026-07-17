import { useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { estimateCaloriesForLabel } from '../../data/foodCalorieMap';
import { analyzeFoodPhoto } from '../../services/aiService';

let cachedModel = null;

const loadMobileNet = async () => {
  if (cachedModel) return cachedModel;
  await tf.ready();
  cachedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
  return cachedModel;
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const FoodPhotoUpload = ({ onEstimate }) => {
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState('');
  const [visionSource, setVisionSource] = useState('');

  const runClientMobileNet = async (img) => {
    const model = await loadMobileNet();
    const results = await model.classify(img, 5);
    return results.map((p) => {
      const label = p.className.split(',')[0];
      return {
        label,
        confidence: Math.round(p.probability * 100) / 100,
        calories: estimateCaloriesForLabel(label),
      };
    });
  };

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setPredictions([]);
    setVisionSource('');
    setPreviewUrl(URL.createObjectURL(file));

    requestAnimationFrame(async () => {
      setClassifying(true);
      try {
        const img = imageRef.current;
        if (!img.complete) {
          await new Promise((resolve) => { img.onload = resolve; });
        }

        let results = [];
        try {
          const dataUrl = await fileToBase64(file);
          const hf = await analyzeFoodPhoto(dataUrl);
          results = hf.predictions ?? [];
          if (results.length) setVisionSource('Hugging Face (food model)');
        } catch {
          results = await runClientMobileNet(img);
          setVisionSource('MobileNet (browser fallback)');
        }

        setPredictions(results);
      } catch {
        setError('Could not classify this photo. Try a clearer, well-lit shot.');
      } finally {
        setClassifying(false);
      }
    });
  }, []);

  const handleConfirm = (prediction) => {
    onEstimate({
      label: prediction.label,
      confidence: prediction.confidence,
      calories: prediction.calories,
      source: 'photo',
    });
    setPredictions([]);
    setPreviewUrl(null);
    setVisionSource('');
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

      {classifying && <p className="text-xs text-gray-400">Analyzing with AI vision...</p>}
      {visionSource && !classifying && (
        <p className="text-xs text-green-400 mb-2">✓ {visionSource}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {predictions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Tap the closest match:</p>
          {predictions.map((p) => (
            <button
              key={`${p.label}-${p.confidence}`}
              onClick={() => handleConfirm(p)}
              className="w-full flex items-center justify-between bg-gray-900/60 hover:bg-gray-700
                         border border-gray-700 rounded-lg px-3 py-2 text-left transition"
            >
              <span className="text-sm capitalize">{p.label}</span>
              <span className="text-xs text-gray-400">
                {Math.round(p.confidence * 100)}% match · ~{p.calories} kcal
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodPhotoUpload;
