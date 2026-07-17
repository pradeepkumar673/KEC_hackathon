import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchReadinessScore } from '../services/progressService';
import { fetchTodayNutrition } from '../services/nutritionService';
import { fetchWorkoutHistory } from '../services/workoutService';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({ score: 84, level: 'moderate', factors: ['Rest day was effective'] });
  const [nutrition, setNutrition] = useState({ totalCalories: 1840, goalCalories: 2500 });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [weeklyBurn, setWeeklyBurn] = useState(12450);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Readiness
        const readinessRes = await fetchReadinessScore();
        if (readinessRes) {
          setReadiness(readinessRes);
        }

        // 2. Fetch Nutrition
        const nutritionRes = await fetchTodayNutrition();
        if (nutritionRes) {
          const totalLogged = nutritionRes.summary?.calories || 0;
          setNutrition({
            totalCalories: Math.round(totalLogged),
            goalCalories: user?.calorieGoal || 2500
          });
        }

        // 3. Fetch Workout History
        const workoutRes = await fetchWorkoutHistory(1, 3);
        if (workoutRes && workoutRes.sessions) {
          setRecentWorkouts(workoutRes.sessions);
          
          // Calculate a dummy/approximate weekly burn based on history
          const totalBurned = workoutRes.sessions.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);
          setWeeklyBurn(totalBurned > 0 ? Math.round(totalBurned + 1000) : 12450);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const remainingCalories = Math.max(0, nutrition.goalCalories - nutrition.totalCalories);
  const caloriePercent = Math.min(100, (nutrition.totalCalories / nutrition.goalCalories) * 100);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <section className="animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-1">
          Good Morning, {user?.name || 'Athlete'}.
        </h2>
        <p className="text-gray-400 text-sm md:text-base">
          Your metabolic readiness is <span className="text-orange-400 font-semibold">{readiness.level}</span>. 
          {readiness.level === 'high' ? " It's a prime day to push for high intensity!" : " Focus on consistent execution today."}
        </p>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:border-red-500/20">
          <div className="flex justify-between items-start mb-4">
            <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Readiness Score</span>
            <span className="material-symbols-outlined text-red-500">bolt</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-red-400 font-stats-num">{readiness.score}</span>
            <span className="text-gray-400 font-bold mb-2">%</span>
          </div>
          <div className="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full primary-gradient transition-all duration-500" style={{ width: `${readiness.score}%` }}></div>
          </div>
          <p className="text-xs text-orange-400 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">analytics</span>
            CNS state: {readiness.level.toUpperCase()}
          </p>
        </div>

        {/* Daily Calorie Goal Card */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between transition-all duration-300 hover:border-red-500/20">
          <div>
            <span className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4 block">Daily Calories</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-stats-num">{nutrition.totalCalories}</span>
              <span className="text-gray-400 text-sm">/ {nutrition.goalCalories} kcal</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{remainingCalories} kcal remaining</p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90">
              <circle className="text-gray-800" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" stroke-width="6"></circle>
              <circle 
                className="text-red-500 transition-all duration-500" 
                cx="40" 
                cy="40" 
                fill="transparent" 
                r="34" 
                stroke="currentColor" 
                strokeDasharray="213.6" 
                strokeDashoffset={213.6 - (213.6 * caloriePercent) / 100} 
                strokeLinecap="round" 
                strokeWidth="6"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400">restaurant</span>
            </div>
          </div>
        </div>

        {/* Weekly Burn Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-red-500/20">
          <span className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4 block">Weekly Burn</span>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-black text-white font-stats-num">{weeklyBurn}</span>
            <span className="text-gray-400 text-sm">kcal total</span>
          </div>
          <div className="h-16 w-full flex items-end gap-1.5">
            <div className="flex-1 bg-gray-800 h-[60%] rounded-t-sm"></div>
            <div className="flex-1 bg-gray-800 h-[45%] rounded-t-sm"></div>
            <div className="flex-1 bg-gray-800 h-[85%] rounded-t-sm"></div>
            <div className="flex-1 bg-gray-800 h-[70%] rounded-t-sm"></div>
            <div className="flex-1 primary-gradient h-[95%] rounded-t-sm"></div>
            <div className="flex-1 bg-gray-800 h-[55%] rounded-t-sm"></div>
            <div className="flex-1 bg-gray-800 h-[30%] rounded-t-sm"></div>
          </div>
        </div>
      </section>

      {/* Quick Actions Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Action 1: Start Live Tracker */}
        <button 
          onClick={() => navigate('/live-tracker')}
          className="relative overflow-hidden group rounded-2xl p-[1px] focus:outline-none transition transform hover:scale-[1.01]"
        >
          <div className="absolute inset-0 primary-gradient opacity-20 group-hover:opacity-30 transition-all duration-300"></div>
          <div className="relative glass-card p-8 h-full rounded-[calc(1rem-1px)] flex flex-col items-center text-center hover:bg-gray-800/40 transition-all">
            <div className="w-14 h-14 rounded-full primary-gradient flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,59,48,0.4)] pulse-effect">
              <span className="material-symbols-outlined text-white text-3xl">play_arrow</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start Live Workout</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Real-time AI skeleton tracking & form verification</p>
          </div>
        </button>

        {/* Action 2: Generate AI Workout */}
        <button 
          onClick={() => navigate('/workout-generator')}
          className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:bg-gray-800/50 hover:border-red-500/20 transition transform hover:scale-[1.01]"
        >
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4 border border-gray-700">
            <span className="material-symbols-outlined text-orange-400 text-3xl">auto_awesome</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Generate AI Workout</h3>
          <p className="text-xs text-gray-400 leading-relaxed">Personalized routine based on current fatigue levels</p>
        </button>

        {/* Action 3: Log Meal */}
        <button 
          onClick={() => navigate('/nutrition')}
          className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:bg-gray-800/50 hover:border-red-500/20 transition transform hover:scale-[1.01]"
        >
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4 border border-gray-700">
            <span className="material-symbols-outlined text-red-400 text-3xl">add_a_photo</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Log Meal</h3>
          <p className="text-xs text-gray-400 leading-relaxed">Snap a photo for instant macro-nutrient analysis</p>
        </button>
      </section>

      {/* Recent Activity & AI Coach Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workouts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <button 
              onClick={() => navigate('/progress')}
              className="text-red-400 text-xs font-bold hover:underline uppercase tracking-wider"
            >
              View Analytics
            </button>
          </div>
          <div className="space-y-3">
            {recentWorkouts.length === 0 ? (
              <div className="glass-card p-6 rounded-2xl text-center text-gray-400 text-sm">
                No recent workouts. Tap "Start Live Workout" to record your first session!
              </div>
            ) : (
              recentWorkouts.map((w, idx) => (
                <div key={w._id || idx} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-red-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-500">fitness_center</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white capitalize">{w.exerciseType} session</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="bg-gray-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded text-gray-400">
                          Reps: {w.reps}
                        </span>
                        <span className="bg-gray-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded text-gray-400">
                          Form: {Math.round(w.formScore)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-stats-num text-lg block">
                      {Math.floor(w.durationSeconds / 60)}:{(w.durationSeconds % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      {new Date(w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between border border-red-500/10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-full bg-red-500/10">
                <span className="material-symbols-outlined text-red-500 text-sm">smart_toy</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">Burn-Ex AI Coach</span>
            </div>
            <h4 className="text-lg font-bold text-white leading-snug mb-3">
              "Your central nervous system recovery is at {readiness.score}%."
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {readiness.factors[0] || 'Keep up the good work! Make sure to stay hydrated during training.'}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
              <span>CNS Recovery</span>
              <span>{readiness.score}%</span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full primary-gradient transition-all duration-500" style={{ width: `${readiness.score}%` }}></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
