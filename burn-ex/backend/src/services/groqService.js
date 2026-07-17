/**
 * Groq API — server-side only. Set GROQ_API_KEY in backend/.env
 */
import axios from 'axios';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant';

export const isGroqConfigured = () => Boolean(process.env.GROQ_API_KEY);

const chat = async (messages, { maxTokens = 512, temperature = 0.6, model = DEFAULT_MODEL } = {}) => {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const { data } = await axios.post(
    GROQ_URL,
    {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty Groq response');
  return text;
};

export const generateNutritionSuggestions = async (context) => {
  const {
    name,
    goal,
    remaining,
    calorieGoal,
    caloriesConsumed,
    caloriesBurned,
    entries,
  } = context;

  const foodList =
    entries?.length > 0
      ? entries.map((e) => `${e.label} (${e.calories} kcal)`).join(', ')
      : 'nothing logged yet';

  const system = `You are Burn-Ex nutrition coach. Give 2-3 short, actionable bullet tips (one sentence each). Be specific with foods and approximate kcal when helpful. No markdown headers. Use plain sentences.`;

  const user = `User: ${name || 'Athlete'}, goal: ${goal || 'general_fitness'}.
Daily calorie target: ${calorieGoal} kcal. Consumed: ${caloriesConsumed}. Burned from workouts: ${caloriesBurned}. Remaining budget: ${Math.round(remaining)} kcal.
Logged today: ${foodList}.
Suggest what to eat next or how to adjust today.`;

  try {
    const raw = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 350, temperature: 0.5 }
    );
    return raw
      .split('\n')
      .map((line) => line.replace(/^[\s•\-*\d.)]+/, '').trim())
      .filter(Boolean)
      .slice(0, 4);
  } catch (err) {
    console.warn('Groq nutrition suggestions failed:', err.message);
    return null;
  }
};

export const generateWorkoutSummary = async (context) => {
  const {
    exerciseLabel,
    reps,
    durationSeconds,
    formScore,
    fatigueScore,
    injuryRisk,
    riskFactors,
    userGoal,
  } = context;

  const risks =
    riskFactors?.length > 0
      ? riskFactors.map((f) => f.message).join(' ')
      : 'No major form alerts.';

  const system = `You are an encouraging fitness coach for Burn-Ex. Write a brief post-workout summary: 3-4 sentences max. Mention reps, form, fatigue/injury if relevant, and one concrete next step. Warm but professional. No bullet lists.`;

  const user = `Exercise: ${exerciseLabel}. Reps: ${reps}. Duration: ${durationSeconds}s. Avg form score: ${formScore ?? 'N/A'}/100. Fatigue: ${fatigueScore}%. Injury risk: ${injuryRisk}%. User goal: ${userGoal || 'general fitness'}. Form notes: ${risks}`;

  try {
    return await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 280, temperature: 0.55 }
    );
  } catch (err) {
    console.warn('Groq workout summary failed:', err.message);
    return null;
  }
};

export const generateFormTip = async (context) => {
  const { exerciseLabel, lastRepScore, formIssue, fatigueLevel } = context;

  const system = `You are a real-time form coach. Reply with ONE short sentence (max 15 words) the athlete can hear while exercising. Direct and actionable.`;

  const user = `Exercise: ${exerciseLabel}. Last rep form score: ${lastRepScore}/100. Current cue: ${formIssue || 'none'}. Fatigue: ${fatigueLevel}. Give one correction or encouragement.`;

  try {
    const tip = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 60, temperature: 0.4, model: FAST_MODEL }
    );
    return tip.split('\n')[0].trim();
  } catch (err) {
    console.warn('Groq form tip failed:', err.message);
    return null;
  }
};
