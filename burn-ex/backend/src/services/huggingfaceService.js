/**
 * Hugging Face Inference API — server-side only. Set HF_API_TOKEN in backend/.env
 * Food model: nateraw/food (101 food categories)
 */
import axios from 'axios';

const HF_MODEL = process.env.HF_FOOD_MODEL || 'nateraw/food';

export const isHfConfigured = () => Boolean(process.env.HF_API_TOKEN);

const FOOD_CALORIE_ESTIMATES = {
  pizza: 285,
  burger: 450,
  sushi: 350,
  ramen: 400,
  steak: 420,
  chicken: 220,
  salad: 180,
  pasta: 380,
  sandwich: 320,
  donut: 260,
  cake: 350,
  apple: 95,
  banana: 105,
  fries: 320,
  taco: 280,
  burrito: 445,
  ice_cream: 210,
  default: 250,
};

const estimateCalories = (label) => {
  const key = label.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  for (const [food, kcal] of Object.entries(FOOD_CALORIE_ESTIMATES)) {
    if (key.includes(food) || food.includes(key)) return kcal;
  }
  return FOOD_CALORIE_ESTIMATES.default;
};

/**
 * @param {string} imageBase64 - raw base64 or data URL
 * @returns {Promise<Array<{ label: string, confidence: number, calories: number }>>}
 */
export const classifyFoodImage = async (imageBase64) => {
  if (!isHfConfigured()) {
    throw new Error('HF_API_TOKEN is not configured');
  }

  let base64 = imageBase64;
  if (base64.includes(',')) {
    base64 = base64.split(',')[1];
  }

  const buffer = Buffer.from(base64, 'base64');

  const url = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

  const postOnce = () =>
    axios.post(url, buffer, {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      timeout: 45000,
    });

  let response;
  try {
    response = await postOnce();
  } catch (err) {
    const status = err.response?.status;
    if (status === 503 || status === 504) {
      await new Promise((r) => setTimeout(r, 5000));
      response = await postOnce();
    } else {
      const detail = err.response?.data?.error || err.response?.data?.message || err.message;
      throw new Error(`HF inference failed (${status || 'network'}): ${detail}`);
    }
  }

  const data = response.data;

  if (!Array.isArray(data)) {
    throw new Error('Unexpected HF response format');
  }

  return data.slice(0, 5).map((item) => {
    const label = (item.label || 'food').replace(/_/g, ' ');
    const confidence = item.score ?? 0;
    return {
      label,
      confidence: Math.round(confidence * 100) / 100,
      calories: estimateCalories(label),
    };
  });
};
