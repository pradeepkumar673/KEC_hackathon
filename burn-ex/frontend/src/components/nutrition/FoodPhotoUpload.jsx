import { useRef, useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { estimateCaloriesForLabel } from '../../data/foodCalorieMap';
import { analyzeFoodPhoto, fetchAiStatus } from '../../services/aiService';
import { compressImageForUpload } from '../../utils/imageCompress';

let cachedModel = null;

const loadMobileNet = async () => {
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
  const [phase, setPhase] = useState('idle'); // idle | preparing | hf | mobilenet | done
  const [error, setError] = useState('');
  const [visionSource, setVisionSource] = useState('');
  const [hfAvailable, setHfAvailable] = useState(null);

  useEffect(() => {
    fetchAiStatus()
      .then((s) => setHfAvailable(Boolean(s?.huggingface)))
      .catch(() => setHfAvailable(false));
  }, []);

  const runClientMobileNet = async (img) => {
    setPhase('mobilenet');
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

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');
    setPredictions([]);
    setVisionSource('');
    setPhase('preparing');
    setPreviewUrl(URL.createObjectURL(file));

    requestAnimationFrame(async () => {
      try {
        const img = imageRef.current;
        if (!img?.complete) {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        }

        let results = [];
        let usedHf = false;

        if (hfAvailable !== false) {
          try {
            setPhase('hf');
            const dataUrl = await compressImageForUpload(file);
            const hf = await analyzeFoodPhoto(dataUrl);
            results = hf.predictions ?? [];
            if (results.length > 0) {
              usedHf = true;
              setVisionSource('Hugging Face food model (server)');
            }
          } catch (hfErr) {
            console.warn('HF path failed:', hfErr.message);
          }
        }

        if (!usedHf) {
          results = await runClientMobileNet(img);
          setVisionSource(
            hfAvailable === false
              ? 'MobileNet (HF not configured on server)'
              : 'MobileNet (browser fallback)'
          );
        }

        if (results.length === 0) {
          setError('No food matches found — try a clearer photo or log manually.');
        } else {
          setPredictions(results);
          setPhase('done');
        }
      } catch {
        setError('Could not classify this photo. Try a clearer, well-lit shot.');
        setPhase('idle');
      }
    });
  }, [hfAvailable]);

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
    setPhase('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const phaseLabel = {
    preparing: 'Preparing image…',
    hf: 'Analyzing with Hugging Face food model…',
    mobilenet: 'Loading MobileNet fallback…',
  }[phase];

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Log food from a photo</p>
        {hfAvailable === true && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            HF ready
          </span>
        )}
        {hfAvailable === false && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-600/40 text-gray-400">
            MobileNet only
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={phase === 'preparing' || phase === 'hf' || phase === 'mobilenet'}
        onChange={handleFileChange}
        className="text-xs text-gray-400 mb-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg
                   file:border-0 file:bg-orange-500 file:text-white file:text-xs
                   hover:file:bg-orange-600 file:cursor-pointer disabled:opacity-50"
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

      {phaseLabel && (
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          {phaseLabel}
        </div>
      )}

      {visionSource && phase === 'done' && (
        <p className="text-xs text-green-400 mb-2">✓ {visionSource}</p>
      )}

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

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
                {Math.round(p.confidence <= 1 ? p.confidence * 100 : p.confidence)}% · ~{p.calories} kcal
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FoodPhotoUpload;
