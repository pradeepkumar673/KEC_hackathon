import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import FoodPhotoUpload from '../components/nutrition/FoodPhotoUpload';
import { calculateBMR, calculateTDEE, calculateCalorieGoal, ACTIVITY_LABELS, GOAL_LABELS } from '../utils/nutritionCalculator';
import { fetchTodayNutrition, logFoodEntry, deleteFoodEntry, fetchSuggestions } from '../services/nutritionService';
import { FlameIcon, TrashIcon, SparklesIcon } from '../utils/icons';

const Nutrition = () => {
  const { user } = useAuth();

  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const bmr = calculateBMR({ weightKg: user?.weight, heightCm: user?.height, age: user?.age, gender: user?.gender });
  const tdee = calculateTDEE(bmr, user?.activityLevel);
  const calorieGoalPreview = calculateCalorieGoal(tdee, user?.goal);

  const loadToday = useCallback(async () => {
    try {
      const data = await fetchTodayNutrition();
      setToday(data);
      setError('');
    } catch {
      setError("Couldn't load today's nutrition log.");
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestionsLoading(true);
      const data = await fetchSuggestions();
      setSuggestions(data.suggestions ?? []);
    } catch {
      // non-critical — suggestions are a bonus panel
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
    loadSuggestions();
  }, [loadToday, loadSuggestions]);

  const refreshAll = async () => {
    await loadToday();
    await loadSuggestions();
  };

  const handlePhotoEstimate = async (entry) => {
    try {
      await logFoodEntry(entry);
      await refreshAll();
    } catch {
      setError('Could not save that entry — try again.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualLabel.trim() || !manualCalories) return;
    try {
      await logFoodEntry({ label: manualLabel.trim(), calories: Number(manualCalories), source: 'manual' });
      setManualLabel('');
      setManualCalories('');
      await refreshAll();
    } catch {
      setError('Could not save that entry — try again.');
    }
  };

  const handleDelete = async (index) => {
    try {
      await deleteFoodEntry(index);
      await refreshAll();
    } catch {
      setError('Could not remove that entry — try again.');
    }
  };

  const consumed = today?.caloriesConsumed ?? 0;
  const burned = today?.caloriesBurned ?? 0;
  const goal = today?.calorieGoal ?? calorieGoalPreview ?? 2000;
  const remaining = today?.remaining ?? goal - consumed;
  const progressPct = Math.round((consumed / goal) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <FlameIcon className="w-7 h-7 text-orange-500" />
        <h1 className="text-2xl font-bold">Nutrition</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* BMR / TDEE calculator */}
      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">BMR & TDEE</h2>
        {!user?.weight || !user?.height || !user?.age ? (
          <p className="text-xs text-yellow-500">Your profile is missing weight, height, or age — complete it to see your numbers.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-500">{bmr}</div>
              <div className="text-xs text-gray-400 mt-1">BMR (kcal/day)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{tdee}</div>
              <div className="text-xs text-gray-400 mt-1">TDEE (kcal/day)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{goal}</div>
              <div className="text-xs text-gray-400 mt-1">Daily goal</div>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4">
          {ACTIVITY_LABELS[user?.activityLevel] ?? 'Activity level not set'} · Goal: {GOAL_LABELS[user?.goal] ?? 'Not set'}
        </p>
      </section>

      {/* Today's progress */}
      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="text-sm font-semibold text-gray-300">Today's calories</h2>
          <span className="text-xs text-gray-400">{consumed} / {goal} kcal</span>
        </div>
        <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all ${progressPct > 100 ? 'bg-red-500' : 'bg-orange-500'}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div><div className="font-bold">{consumed}</div><div className="text-xs text-gray-400">Consumed</div></div>
          <div><div className="font-bold text-yellow-400">{burned}</div><div className="text-xs text-gray-400">Burned (workouts)</div></div>
          <div><div className={`font-bold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>{remaining}</div><div className="text-xs text-gray-400">Remaining</div></div>
        </div>
      </section>

      {/* Photo upload */}
      <section className="mb-2">
        <FoodPhotoUpload onEstimate={handlePhotoEstimate} />
        <p className="text-xs text-gray-500 mt-2">
          MobileNetV2 recognizes general food shapes — pick the closest match, or log manually below for anything it misses.
        </p>
      </section>

      {/* Manual entry */}
      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 my-6">
        <p className="text-sm font-semibold mb-3">Log manually</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2 flex-wrap">
          <input
            value={manualLabel}
            onChange={(e) => setManualLabel(e.target.value)}
            placeholder="e.g. Grilled chicken salad"
            className="flex-1 min-w-[160px] bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={manualCalories}
            onChange={(e) => setManualCalories(e.target.value)}
            type="number"
            min="0"
            placeholder="kcal"
            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-semibold">Add</button>
        </form>
      </section>

      {/* Entries */}
      {today?.entries?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Today's log</h2>
          <div className="space-y-2">
            {today.entries.map((entry, i) => (
              <div key={`${entry.label}-${i}`} className="flex items-center justify-between bg-gray-800/40 border border-gray-700 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm capitalize">{entry.label}</p>
                  <p className="text-xs text-gray-500">{entry.calories} kcal · {entry.source === 'photo' ? '📷 photo' : '✍️ manual'}</p>
                </div>
                <button onClick={() => handleDelete(i)} className="text-gray-500 hover:text-red-400">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions */}
      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-orange-400" />
          <h2 className="text-sm font-semibold text-gray-300">Suggestions</h2>
        </div>
        {suggestionsLoading ? (
          <p className="text-xs text-gray-500">Thinking...</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s, i) => <li key={i} className="text-sm text-gray-300">• {s}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Nutrition;
