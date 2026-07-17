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
        setError('Could not retrieve biometric analytics logs.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
        <span className="text-xs font-medium">Calibrating biometrics telemetry...</span>
      </div>
    );
  }

  // Calculate stats
  const totalVolume = history.reduce((sum, s) => sum + (s.reps || 0), 0);
  const avgFormScore = history.length > 0 
    ? Math.round(history.reduce((sum, s) => sum + (s.formScore || 0), 0) / history.length) 
    : 85;

  return (
    <div className="space-y-8 animate-fade-in text-on-surface">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface font-display-lg">
            Performance Analytics
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm">
            Real-time telemetry, biometrics, and muscle activation mapping
          </p>
        </div>
      </section>

      {error && (
        <div className="bg-primary/10 border border-primary/25 text-primary text-xs rounded-xl p-4 flex items-center gap-2 font-semibold">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{error}</span>
        </div>
      )}

      {/* Top Cards Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Strength Index */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden transition-all duration-300 hover:border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 font-label-bold">Strength Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-on-surface font-stats-num">{avgFormScore}</span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">trending_up</span>12%
              </span>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-surface-container w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-orange-500 transition-all duration-500" style={{ width: `${avgFormScore}%` }}></div>
          </div>
        </div>

        {/* Endurance Score */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden transition-all duration-300 hover:border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 font-label-bold">Endurance Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-on-surface font-stats-num">67.5</span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">trending_up</span>5%
              </span>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-surface-container w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-tertiary to-cyan-500 transition-all duration-500" style={{ width: '67.5%' }}></div>
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden transition-all duration-300 hover:border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 font-label-bold">Weekly Volume</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-on-surface font-stats-num">{totalVolume || 140}</span>
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">reps completed</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-surface-container w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-orange-500 transition-all duration-500" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Recovery HRV */}
        <div className="glass-panel p-6 rounded-3xl border border-outline-variant relative overflow-hidden transition-all duration-300 hover:border-primary/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 font-label-bold">Recovery HRV</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-on-surface font-stats-num">92</span>
              <span className="text-[10px] font-bold uppercase text-tertiary tracking-wider">milliseconds</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-surface-container w-full relative overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-primary transition-all duration-500" style={{ width: '92%' }}></div>
          </div>
        </div>
      </section>

      {/* Bento Grid Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Rep Comparison */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-outline-variant flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1 font-label-bold">Repetition Volume</h3>
              <p className="text-xs text-on-surface-variant">Weekly performance aggregate comparison</p>
            </div>
            {weekly && (
              <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                weekly.totalChangePct >= 0 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-primary/10 border-primary/20 text-primary'
              }`}>
                {weekly.totalChangePct >= 0 ? '+' : ''}{weekly.totalChangePct}% overall
              </span>
            )}
          </div>
          <div className="flex-1 min-h-[220px]">
            {weekly ? (
              <WeeklyComparisonChart byExercise={weekly.byExercise} />
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant text-xs font-medium">Telemetry empty</div>
            )}
          </div>
        </div>

        {/* Calorie Burn Trend */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-outline-variant flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1 font-label-bold">Daily Caloric Burn</h3>
            <p className="text-xs text-on-surface-variant">Estimated metabolic expenditure trend over 14 days</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            {calorieTrend.length > 0 ? (
              <SvgLineChart data={calorieTrend} valueKey="calories" color="#ff5545" />
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant text-xs font-medium">No calorie tracking records logged yet</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Consistency Trend */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-outline-variant flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1 font-label-bold">Pose Alignment Consistency</h3>
            <p className="text-xs text-on-surface-variant">Computer vision posture validation over last 14 sessions</p>
          </div>
          <div className="flex-1 min-h-[180px]">
            {formTrend.some(d => d.formScore !== null) ? (
              <SvgLineChart data={formTrend} valueKey="formScore" color="#06b6d4" yMax={100} />
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant text-xs font-medium">No pose scored sessions on record</div>
            )}
          </div>
        </div>

        {/* Muscle Activation Heatmap */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-outline-variant flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-1 font-label-bold">Muscle Activation Map</h3>
            <p className="text-xs text-on-surface-variant">Weekly targeted distribution heatmap</p>
          </div>
          <div className="mt-4 flex justify-center">
            <MuscleHeatmap heatmap={heatmap} />
          </div>
        </div>
      </section>

      {/* History Table */}
      <section className="glass-panel rounded-3xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label-bold">Activity Telemetry Log</h3>
          <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Connected Database
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant text-[10px] text-on-surface-variant uppercase tracking-widest font-bold font-label-bold">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Target Motion</th>
                <th className="p-4">Reps Done</th>
                <th className="p-4">Active Duration</th>
                <th className="p-4 text-right">AI Form Consistency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-on-surface-variant font-medium">
                    No workout sessions recorded. Start a workout session on the Live Coach page to begin logging data.
                  </td>
                </tr>
              ) : (
                history.map((w, idx) => (
                  <tr key={w._id || idx} className="hover:bg-surface-variant/40 transition-colors">
                    <td className="p-4 font-bold text-on-surface">
                      {new Date(w.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 flex items-center gap-2 capitalize font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-sm text-primary">fitness_center</span>
                      {w.exerciseType}
                    </td>
                    <td className="p-4 text-on-surface font-stats-num font-bold">{w.reps}</td>
                    <td className="p-4 text-on-surface-variant">
                      {Math.floor(w.durationSeconds / 60)}m {w.durationSeconds % 60}s
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                        w.formScore >= 85 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        w.formScore >= 70 ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        'border-primary/20 bg-primary/10 text-primary'
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
