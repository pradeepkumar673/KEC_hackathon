const WeeklyComparisonChart = ({ byExercise }) => {
  const entries = Object.entries(byExercise ?? {});
  if (entries.length === 0) return <p className="text-xs text-gray-500">No workout data yet this week.</p>;

  const max = Math.max(1, ...entries.flatMap(([, v]) => [v.current, v.previous]));

  return (
    <div className="space-y-4">
      {entries.map(([type, { current, previous, changePct }]) => (
        <div key={type}>
          <div className="flex justify-between text-xs mb-1">
            <span className="capitalize text-gray-300">{type}</span>
            <span className={changePct >= 0 ? 'text-zinc-300' : 'text-zinc-500'}>
              {changePct >= 0 ? '+' : ''}{changePct}% vs last week
            </span>
          </div>
          <div className="flex items-end gap-2 h-16">
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full bg-zinc-700 rounded-t" style={{ height: `${(previous / max) * 100}%` }} />
              <span className="text-[10px] text-gray-500 mt-1">Last: {previous}</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full bg-zinc-200 rounded-t" style={{ height: `${(current / max) * 100}%` }} />
              <span className="text-[10px] text-gray-400 mt-1">This: {current}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyComparisonChart;
