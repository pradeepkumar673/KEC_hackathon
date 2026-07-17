import { useState, useEffect } from 'react';
import { fetchWeeklyComparison, fetchCalorieTrend, fetchFormTrend, fetchMuscleHeatmap } from '../services/progressService';
import WeeklyComparisonChart from '../components/dashboard/WeeklyComparisonChart';
import SvgLineChart from '../components/dashboard/SvgLineChart';
import MuscleHeatmap from '../components/dashboard/MuscleHeatmap';
import { TrophyIcon } from '../utils/icons';

const ProgressDashboard = () => {
  const [weekly, setWeekly] = useState(null);
  const [calorieTrend, setCalorieTrend] = useState([]);
  const [formTrend, setFormTrend] = useState([]);
  const [heatmap, setHeatmap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [weeklyData, calorieData, formData, heatmapData] = await Promise.all([
          fetchWeeklyComparison(),
          fetchCalorieTrend(14),
          fetchFormTrend(14),
          fetchMuscleHeatmap(7),
        ]);
        setWeekly(weeklyData);
        setCalorieTrend(calorieData.series);
        setFormTrend(formData.series);
        setHeatmap(heatmapData.heatmap);
      } catch {
        setError('Could not load progress data. Try again shortly.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading your progress...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center gap-3 mb-6">
        <TrophyIcon className="w-7 h-7 text-orange-500" />
        <h1 className="text-2xl font-bold">Progress Dashboard</h1>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-6">{error}</div>}

      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Week-over-week reps</h2>
          {weekly && (
            <span className={`text-xs font-semibold ${weekly.totalChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {weekly.totalChangePct >= 0 ? '+' : ''}{weekly.totalChangePct}% overall
            </span>
          )}
        </div>
        {weekly && <WeeklyComparisonChart byExercise={weekly.byExercise} />}
      </section>

      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Calories burned — last 14 days</h2>
        {calorieTrend.length > 0 ? (
          <SvgLineChart data={calorieTrend} valueKey="calories" color="#FBBF24" />
        ) : (
          <p className="text-xs text-gray-500">No workout sessions logged yet.</p>
        )}
      </section>

      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Form score — last 14 days</h2>
        {formTrend.some((d) => d.formScore !== null) ? (
          <SvgLineChart data={formTrend} valueKey="formScore" color="#4ADE80" yMax={100} />
        ) : (
          <p className="text-xs text-gray-500">No scored reps yet — complete a tracked session to see this trend.</p>
        )}
      </section>

      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Muscle activation heatmap — last 7 days</h2>
        <MuscleHeatmap heatmap={heatmap} />
      </section>
    </div>
  );
};

export default ProgressDashboard;
