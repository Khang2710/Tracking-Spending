export interface TrendDatum {
  m: string;
  income: number;
  outcome: number;
  savings: number;
}

const SERIES = [
  { key: "income", label: "Income", color: "#4F7D62" },
  { key: "outcome", label: "Spending", color: "#A75D4D" },
  { key: "savings", label: "Savings", color: "#171A16" },
] as const;

export function SvgTrendChart({ data, formatValue = (value) => value.toLocaleString(), focusIndex, labels }: { data: TrendDatum[]; formatValue?: (value: number) => string; focusIndex?: number; labels?: { income: string; spending: string; savings: string } }) {
  if (focusIndex !== undefined) {
    const datum = data[focusIndex] ?? { m: "", income: 0, outcome: 0, savings: 0 };
    const maximum = Math.max(1, datum.income, datum.outcome, datum.savings);
    const focusedSeries = [
      { key: "income" as const, label: labels?.income ?? "Income", color: "#4F7D62" },
      { key: "outcome" as const, label: labels?.spending ?? "Spending", color: "#A75D4D" },
      { key: "savings" as const, label: labels?.savings ?? "Savings", color: "#171A16" },
    ];
    return (
      <div role="img" aria-label="Income, spending, and savings trend" className="flex h-full w-full flex-col justify-center gap-5">
        {focusedSeries.map((series, index) => {
          const value = datum[series.key];
          const width = value === 0 ? 0 : Math.max(2, (value / maximum) * 100);
          return <div key={series.key} className="grid grid-cols-[76px_minmax(0,1fr)_72px] items-center gap-3 sm:grid-cols-[96px_minmax(0,1fr)_88px] sm:gap-4">
            <span className="text-[13px] font-extrabold text-[#191B17]">{series.label}</span>
            <span className="h-3.5 overflow-hidden rounded-full bg-[#ECECE7]"><span className="block h-full rounded-full transition-[width] duration-500" style={{ background: series.color, width: `${width}%` }} /></span>
            <span className="money-figure text-right text-[14px] font-extrabold text-[#191B17]">{formatValue(value)}</span>
          </div>;
        })}
      </div>
    );
  }
  const width = 600;
  const height = 260;
  const padding = { top: 54, right: 18, bottom: 32, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(1, ...data.flatMap((datum) => [datum.income, datum.outcome, datum.savings]));
  const slot = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.min(8, Math.max(3, slot / 5));
  const totals = {
    income: data.reduce((sum, item) => sum + item.income, 0),
    outcome: data.reduce((sum, item) => sum + item.outcome, 0),
    savings: data.reduce((sum, item) => sum + item.savings, 0),
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Income, spending, and savings trend" className="h-full w-full" preserveAspectRatio="none">
      <text x={padding.left} y="18" fill="#74786F" fontSize="10" fontWeight="700" letterSpacing="1.2">MONTHLY TIMELINE</text>
      {SERIES.map((series, index) => (
        <g key={series.key} data-testid="trend-series" transform={`translate(${padding.left + index * 128}, 36)`}>
          <circle cx="0" cy="-3" r="3" fill={series.color} />
          <text x="8" y="0" fill="#74786F" fontSize="10" fontWeight="600">{series.label}</text>
          <text x="8" y="14" fill="#191B17" fontSize="13" fontWeight="800">{formatValue(totals[series.key])}</text>
        </g>
      ))}
      <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} rx="14" fill="#FBFCFA" />
      {[0, 0.5, 1].map((value) => {
        const y = padding.top + chartHeight - value * chartHeight;
        return <line key={value} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(25,27,23,0.08)" strokeDasharray="3 5" />;
      })}
      {data.map((datum, index) => {
        const center = padding.left + slot * index + slot / 2;
        return <g key={datum.m}>
          {SERIES.map((series, seriesIndex) => {
            const value = datum[series.key];
            const barHeight = value > 0 ? Math.max(3, (value / maximum) * (chartHeight - 10)) : 2;
            return <rect key={series.key} x={center + (seriesIndex - 1) * (barWidth + 2) - barWidth / 2} y={padding.top + chartHeight - barHeight} width={barWidth} height={barHeight} rx={barWidth / 2} fill={value > 0 ? series.color : "#E8EEE4"} />;
          })}
          <text x={center} y={height - 9} textAnchor="middle" fill="#74786F" fontSize="10" fontWeight="700">{datum.m}</text>
        </g>;
      })}
    </svg>
  );
}
