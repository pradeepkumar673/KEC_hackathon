import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import FoodPhotoUpload from '../components/nutrition/FoodPhotoUpload';
import { calculateBMR, calculateTDEE, calculateCalorieGoal, ACTIVITY_LABELS, GOAL_LABELS } from '../utils/nutritionCalculator';
import { fetchTodayNutrition, logFoodEntry, deleteFoodEntry, fetchSuggestions } from '../services/nutritionService';

const Nutrition = () => {
  const { user } = useAuth();

  const [today, setToday] = useState(null);
  const [error, setError] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [aiPoweredSuggestions, setAiPoweredSuggestions] = useState(false);

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
      setAiPoweredSuggestions(Boolean(data.aiPowered));
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
    <div className="space-y-8">
      {/* Header */}
      <section className="animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Nutrition Intelligence</h2>
          <p className="text-gray-400 text-sm">Computer-vision calorie estimates and metabolic tracking</p>
        </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stats & Calorie progress */}
        <div className="lg:col-span-8 space-y-6">
          {/* Daily Goal Progress */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="text-lg font-bold text-white">Today's Progression</h3>
              <span className="text-xs font-bold text-gray-400">{consumed} / {goal} kcal</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPct > 100 ? 'bg-red-500' : 'primary-gradient'}`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-[#111] rounded-xl border border-gray-800/40">
                <span className="text-xl font-black text-white font-stats-num">{consumed}</span>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">Consumed</p>
              </div>
              <div className="p-3 bg-[#111] rounded-xl border border-gray-800/40">
                <span className="text-xl font-black text-red-400 font-stats-num">{burned}</span>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">Burned</p>
              </div>
              <div className="p-3 bg-[#111] rounded-xl border border-gray-800/40">
                <span className={`text-xl font-black font-stats-num ${remaining < 0 ? 'text-red-500' : 'text-green-400'}`}>
                  {remaining}
                </span>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">Remaining</p>
              </div>
            </div>
          </div>

          {/* AI Vision Photo Estimation */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">photo_camera</span>
              <h3 className="text-lg font-bold text-white">Computer Vision Estimate</h3>
            </div>
            <FoodPhotoUpload onEstimate={handlePhotoEstimate} />
            <p className="text-xs text-gray-500">
              Pick/capture a food photo. Burn-Ex uses lightweight client-side vision heuristics to recognize the meal and auto-populate calorie bounds.
            </p>
          </div>

          {/* Manual Entry */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Manual Calorie Logging</h3>
            <form onSubmit={handleManualSubmit} className="flex gap-4 flex-wrap">
              <input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="e.g., Avocado Toast with Egg"
                className="flex-1 min-w-[200px] bg-[#111] border-0 border-b-2 border-gray-800 focus:border-red-500 focus:ring-0 py-3 px-4 text-white text-sm"
                required
              />
              <input
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                type="number"
                min="0"
                placeholder="Calories (kcal)"
                className="w-36 bg-[#111] border-0 border-b-2 border-gray-800 focus:border-red-500 focus:ring-0 py-3 px-4 text-white text-sm"
                required
              />
              <button 
                type="submit" 
                className="px-6 py-3 primary-gradient hover:opacity-90 rounded-lg text-sm font-bold text-white transition-transform active:scale-95"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Metabolic Calculator & Suggestions */}
        <div className="lg:col-span-4 space-y-6">
          {/* BMR & TDEE Calculations */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Metabolic Engine</h3>
            {!user?.weight || !user?.height || !user?.age ? (
              <p className="text-xs text-yellow-500">Please complete weight, height, or age in onboarding to initialize metabolic formulas.</p>
            ) : (
              <div className="space-y-4 divide-y divide-gray-800">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-400">BMR (Metabolic Rate)</span>
                  <span className="text-lg font-bold text-white font-stats-num">{bmr} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-400">TDEE (Daily Expenditure)</span>
                  <span className="text-lg font-bold text-white font-stats-num">{tdee} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-400">Target Deficit/Surplus</span>
                  <span className="text-lg font-bold text-red-400 font-stats-num">{goal} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                </div>
                <div className="pt-4 text-xs text-gray-500 flex flex-wrap gap-2">
                  <span className="bg-gray-800 px-2 py-0.5 rounded">Level: {ACTIVITY_LABELS[user?.activityLevel] ?? 'Moderate'}</span>
                  <span className="bg-gray-800 px-2 py-0.5 rounded">Goal: {GOAL_LABELS[user?.goal] ?? 'Maintain'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Today's Log List */}
          {today?.entries?.length > 0 && (
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Today's Log</h3>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {today.entries.map((entry, i) => (
                  <div key={`${entry.label}-${i}`} className="flex items-center justify-between bg-gray-900/60 border border-gray-800/40 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{entry.label}</p>
                      <p className="text-[10px] text-gray-500">{entry.calories} kcal · {entry.source === 'photo' ? '📷 AI Vision' : '✍️ Manual'}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(i)} 
                      className="text-gray-500 hover:text-red-500 transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Nutrition Suggestions */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400">sparkles</span>
              <h3 className="text-lg font-bold text-white">Dietary Intelligence</h3>
              {aiPoweredSuggestions && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Groq AI
                </span>
              )}
            </div>
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="material-symbols-outlined animate-spin text-sm text-yellow-400">sync</span>
                <span>Calculating meal advice...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.length === 0 ? (
                  <p className="text-xs text-gray-500">Log some food today to receive personalized dietary suggestions.</p>
                ) : (
                  suggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-red-500">•</span>
                      <p>{s}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nutrition;
