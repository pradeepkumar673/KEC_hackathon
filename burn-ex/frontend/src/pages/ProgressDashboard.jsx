import { useState, useEffect } from 'react';
import { fetchWeeklyComparison, fetchCalorieTrend, fetchFormTrend, fetchMuscleHeatmap } from '../services/progressService';
import { fetchWorkoutHistory } from '../services/workoutService';
import WeeklyComparisonChart from '../components/dashboard/WeeklyComparisonChart';
import SvgLineChart from '../components/dashboard/SvgLineChart';
import MuscleHeatmap from '../components/dashboard/MuscleHeatmap';

const ProgressDashboard = () => {
  const [weekly, setWeekly] = useState(null);
  const [calorieTrend, setCalorieTrend] = useState([]);
  const [formTrend, setFormTrend] = useState([]);
  const [heatmap, setHeatmap] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [weeklyData, calorieData, formData, heatmapData, historyData] = await Promise.all([
          fetchWeeklyComparison(),
          fetchCalorieTrend(14),
          fetchFormTrend(14),
          fetchMuscleHeatmap(7),
          fetchWorkoutHistory(1, 10)
        ]);
        setWeekly(weeklyData);
        setCalorieTrend(calorieData.series || []);
        setFormTrend(formData.series || []);
        setHeatmap(heatmapData.heatmap || {});
        setHistory(historyData.sessions || []);
      } catch (err) {
        console.error('Error fetching progress data:', err);
        setError('Could not load progress data. Try again shortly.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 text-gray-400">
        <span className="material-symbols-outlined text-4xl animate-spin text-red-500 mr-2">sync</span>
        <span>Loading performance metrics...</span>
      </div>
    );
  }

  // Calculate volume
  const totalVolume = history.reduce((sum, s) => sum + (s.reps || 0), 0);
  const avgFormScore = history.length > 0 
    ? Math.round(history.reduce((sum, s) => sum + (s.formScore || 0), 0) / history.length) 
    : 85;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Elite Performance Analytics</h2>
          <p className="text-gray-400 text-sm">Real-time biometrics and training distribution metrics</p>
        </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Top Cards Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Strength Index */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-red-500/20">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Strength Index</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white font-stats-num">{avgFormScore}</span>
            <span className="text-red-400 text-xs font-bold mb-1 flex items-center">
              <span className="material-symbols-outlined text-sm">arrow_upward</span> 12%
            </span>
          </div>
          <div className="mt-4 h-1 bg-gray-800 w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 primary-gradient transition-all duration-500" style={{ width: `${avgFormScore}%` }}></div>
          </div>
        </div>

        {/* Endurance Score */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-red-500/20">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Endurance Score</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white font-stats-num">67.5</span>
            <span className="text-red-400 text-xs font-bold mb-1 flex items-center">
              <span className="material-symbols-outlined text-sm">arrow_upward</span> 5%
            </span>
          </div>
          <div className="mt-4 h-1 bg-gray-800 w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-cyan-500 transition-all duration-500" style={{ width: '67.5%' }}></div>
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-red-500/20">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Weekly Reps</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white font-stats-num">{totalVolume || 140}</span>
            <span className="text-gray-400 text-xs mb-1">reps</span>
          </div>
          <div className="mt-4 h-1 bg-gray-800 w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 primary-gradient transition-all duration-500" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Recovery HRV */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-red-500/20">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Recovery HRV</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white font-stats-num">92</span>
            <span className="text-cyan-400 text-xs font-bold mb-1">ms</span>
          </div>
          <div className="mt-4 h-1 bg-gray-800 w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-red-500 transition-all duration-500" style={{ width: '92%' }}></div>
          </div>
        </div>
      </section>

      {/* Bento Grid Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Rep Comparison */}
        <div className="lg:col-span-7 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Rep Volume</h3>
              <p className="text-xs text-gray-400">Weekly performance aggregate</p>
            </div>
            {weekly && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${weekly.totalChangePct >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {weekly.totalChangePct >= 0 ? '+' : ''}{weekly.totalChangePct}% overall
              </span>
            )}
          </div>
          <div className="flex-1 min-h-[220px]">
            {weekly ? (
              <WeeklyComparisonChart byExercise={weekly.byExercise} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data available</div>
            )}
          </div>
        </div>

        {/* Calorie Burn Trend */}
        <div className="lg:col-span-5 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Calorie Burn</h3>
            <p className="text-xs text-gray-400">Total daily expenditure - last 14 days</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            {calorieTrend.length > 0 ? (
              <SvgLineChart data={calorieTrend} valueKey="calories" color="#ff5545" />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No calories logged yet</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Consistency Trend */}
        <div className="lg:col-span-8 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Form Consistency</h3>
            <p className="text-xs text-gray-400">AI analysis - Squat & Deadlift consistency</p>
          </div>
          <div className="flex-1 min-h-[180px]">
            {formTrend.some(d => d.formScore !== null) ? (
              <SvgLineChart data={formTrend} valueKey="formScore" color="#06b6d4" yMax={100} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No scored sessions yet</div>
            )}
          </div>
        </div>

        {/* Muscle Activation Heatmap */}
        <div className="lg:col-span-4 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Muscle Activation</h3>
            <p className="text-xs text-gray-400">Weekly training distribution map</p>
          </div>
          <div className="mt-4">
            <MuscleHeatmap heatmap={heatmap} />
          </div>
        </div>
      </section>

      {/* History Table */}
      <section className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1f0f0d]/30">
          <h3 className="text-lg font-bold text-white">Recent Training Sessions</h3>
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">MERN Integrated</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1f0f0d]/50 text-gray-400 font-bold">
              <tr>
                <th className="p-4 border-b border-gray-800">Date</th>
                <th className="p-4 border-b border-gray-800">Workout Type</th>
                <th className="p-4 border-b border-gray-800">Reps Count</th>
                <th className="p-4 border-b border-gray-800">Duration</th>
                <th className="p-4 border-b border-gray-800">AI Form Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No workout sessions recorded. Complete a workout to see history.
                  </td>
                </tr>
              ) : (
                history.map((w, idx) => (
                  <tr key={w._id || idx} className="hover:bg-gray-800/20 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      {new Date(w.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 flex items-center gap-2 capitalize">
                      <span className="material-symbols-outlined text-red-500">fitness_center</span>
                      {w.exerciseType}
                    </td>
                    <td className="p-4 text-white font-stats-num font-bold">{w.reps}</td>
                    <td className="p-4 text-gray-400">
                      {Math.floor(w.durationSeconds / 60)}m {w.durationSeconds % 60}s
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        w.formScore >= 85 ? 'bg-green-500/10 text-green-400' :
                        w.formScore >= 70 ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {Math.round(w.formScore)}% Accuracy
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ProgressDashboard;
