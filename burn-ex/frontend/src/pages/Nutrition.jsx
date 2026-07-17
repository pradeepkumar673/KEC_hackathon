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
  const [suggestionsError, setSuggestionsError] = useState('');

  const bmr = calculateBMR({ weightKg: user?.weight, heightCm: user?.height, age: user?.age, gender: user?.gender });
  const tdee = calculateTDEE(bmr, user?.activityLevel);
  const calorieGoalPreview = calculateCalorieGoal(tdee, user?.goal);

  const loadToday = useCallback(async () => {
    try {
      const data = await fetchTodayNutrition();
      setToday(data);
      setError('');
    } catch {
      setError("Couldn't retrieve current nutrition metrics.");
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      const data = await fetchSuggestions();
      setSuggestions(data.suggestions ?? []);
      setAiPoweredSuggestions(Boolean(data.aiPowered));
    } catch {
      setSuggestionsError('Unable to generate Groq suggestions at this time.');
      setSuggestions([]);
      setAiPoweredSuggestions(false);
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
      setError('Failed to record estimated calories from photo.');
      throw new Error('save failed');
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
      setError('Could not record custom meal log.');
    }
  };

  const handleDelete = async (index) => {
    try {
      await deleteFoodEntry(index);
      await refreshAll();
    } catch {
      setError('Could not remove that entry.');
    }
  };

  const consumed = today?.caloriesConsumed ?? 0;
  const burned = today?.caloriesBurned ?? 0;
  const goal = today?.calorieGoal ?? calorieGoalPreview ?? 2000;
  const remaining = today?.remaining ?? goal - consumed;
  const progressPct = Math.round((consumed / goal) * 100);

  return (
    <div className="space-y-8 animate-fade-in text-on-surface">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface font-display-lg">
            Nutrition Intelligence
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm">
            Groq meal advisor + HF food vision with MobileNet fallback
          </p>
        </div>
      </section>

      {error && (
        <div className="bg-primary/10 border border-primary/25 text-primary text-xs rounded-xl p-4 flex items-center gap-2 font-semibold">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stats & Calorie Progress */}
        <div className="lg:col-span-8 space-y-6">
          {/* Daily Goal Progress */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">analytics</span>
                Today's progression
              </h3>
              <span className="text-xs font-extrabold text-on-surface">{consumed} / {goal} kcal</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progressPct > 100 
                    ? 'bg-primary' 
                    : 'bg-gradient-to-r from-primary to-orange-500'
                }`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant text-center">
                <span className="text-xl md:text-2xl font-black text-on-surface font-stats-num">{consumed}</span>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Consumed</p>
              </div>
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant text-center">
                <span className="text-xl md:text-2xl font-black text-primary font-stats-num">{burned}</span>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Burned</p>
              </div>
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant text-center">
                <span className={`text-xl md:text-2xl font-black font-stats-num ${remaining < 0 ? 'text-primary' : 'text-emerald-400'}`}>
                  {remaining}
                </span>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Remaining</p>
              </div>
            </div>
          </div>

          {/* AI Vision Photo Estimation */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">photo_camera</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Computer Vision Analysis</h3>
            </div>
            <FoodPhotoUpload onEstimate={handlePhotoEstimate} />
            <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">
              * Hugging Face food classifier via node API (primary) with zero-dependency browser-side MobileNet fallback if backend is unavailable.
            </p>
          </div>

          {/* Manual Entry */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Manual Calorie Logging</h3>
            <form onSubmit={handleManualSubmit} className="flex gap-4 flex-wrap items-center">
              <input
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="e.g., Avocado Toast with Egg"
                className="flex-1 min-w-[200px] bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-2.5 px-4 text-xs text-on-surface font-semibold placeholder-on-surface-variant"
                required
              />
              <input
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                type="number"
                min="0"
                placeholder="Calories (kcal)"
                className="w-36 bg-surface border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary py-2.5 px-4 text-xs text-on-surface font-semibold placeholder-on-surface-variant"
                required
              />
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold transition duration-200 active:scale-95 shadow-lg shadow-primary/15 font-label-bold"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Metabolic Calculator & Suggestions */}
        <div className="lg:col-span-4 space-y-6">
          {/* BMR & TDEE Calculations */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Metabolic Engine</h3>
            {!user?.weight || !user?.height || !user?.age ? (
              <p className="text-xs text-amber-400 font-semibold">Please complete weight, height, or age details in settings to initialize metabolic calculations.</p>
            ) : (
              <div className="space-y-3 divide-y divide-outline-variant">
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-on-surface-variant font-semibold">BMR (Basic Rate)</span>
                  <span className="text-base font-extrabold text-on-surface font-stats-num">{bmr} <span className="text-[10px] font-normal text-on-surface-variant uppercase">kcal</span></span>
                </div>
                <div className="flex justify-between items-center py-2 pt-4">
                  <span className="text-xs text-on-surface-variant font-semibold">TDEE (Daily Expenditure)</span>
                  <span className="text-base font-extrabold text-on-surface font-stats-num">{tdee} <span className="text-[10px] font-normal text-on-surface-variant uppercase">kcal</span></span>
                </div>
                <div className="flex justify-between items-center py-2 pt-4">
                  <span className="text-xs text-on-surface-variant font-semibold">Target Deficit/Surplus</span>
                  <span className="text-base font-extrabold text-primary font-stats-num">{goal} <span className="text-[10px] font-normal text-on-surface-variant uppercase">kcal</span></span>
                </div>
                <div className="pt-4 text-[10px] text-on-surface-variant font-bold flex flex-wrap gap-2 uppercase tracking-wider">
                  <span className="bg-surface-container-highest border border-outline-variant px-2.5 py-1 rounded-md">Activity: {ACTIVITY_LABELS[user?.activityLevel] ?? 'Moderate'}</span>
                  <span className="bg-surface-container-highest border border-outline-variant px-2.5 py-1 rounded-md">Goal: {GOAL_LABELS[user?.goal] ?? 'Maintain'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Today's Log List */}
          {today?.entries?.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Today's Log</h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {today.entries.map((entry, i) => (
                  <div key={`${entry.label}-${i}`} className="flex items-center justify-between bg-surface border border-outline-variant rounded-xl p-3 shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-on-surface capitalize">{entry.label}</p>
                      <p className="text-[9px] text-on-surface-variant font-semibold mt-0.5">{entry.calories} kcal · {entry.source === 'photo' ? '📷 AI Vision' : '✍️ Manual'}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(i)} 
                      className="text-on-surface-variant hover:text-primary transition-colors p-1.5 hover:bg-surface-variant rounded-full flex items-center"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Nutrition Suggestions */}
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Dietary Advisor</h3>
              </div>
              {aiPoweredSuggestions && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider animate-pulse">
                  Groq LLM
                </span>
              )}
            </div>
            
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Requesting diet feedback...</span>
              </div>
            ) : suggestionsError ? (
              <div className="space-y-3">
                <p className="text-xs text-primary font-semibold">{suggestionsError}</p>
                <button
                  type="button"
                  onClick={loadSuggestions}
                  className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant font-bold"
                >
                  Retry Sync
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                    Log today's meals to get real-time analysis of nutritional composition and fitness synergy.
                  </p>
                ) : (
                  suggestions.map((s, i) => (
                    <div key={i} className="flex gap-2.5 text-xs text-on-surface leading-relaxed">
                      <span className="text-primary font-black mt-0.5">•</span>
                      <p className="font-medium">{s}</p>
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
