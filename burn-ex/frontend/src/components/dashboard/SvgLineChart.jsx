const SvgLineChart = ({ data, valueKey, color = '#F97316', height = 160, yMax }) => {
  const width = 600;
  const padding = 24;
  const values = data.map((d) => d[valueKey]).filter((v) => v !== null && v !== undefined);
  const max = yMax ?? Math.max(1, ...values);

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2);
    const v = d[valueKey];
    if (v === null || v === undefined) return null;
    const y = height - padding - (v / (max || 1)) * (height - padding * 2);
    return { x, y, date: d.date };
  });

  const validPoints = points.filter(Boolean);
  const pathD = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
      {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" />}
      {validPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {data.map((d, i) => {
        if (i % Math.max(1, Math.ceil(data.length / 6)) !== 0) return null;
        const x = padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2);
        return (
          <text key={d.date} x={x} y={height - 6} fontSize="9" fill="#9CA3AF" textAnchor="middle">
            {d.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
};

export default SvgLineChart;
