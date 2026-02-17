import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { MetricSeriesPoint } from '../domain/types';

interface MetricChartProps {
  series: MetricSeriesPoint[];
  title: string;
}

interface ChartRow {
  timeSec: number;
  sliPct: number | null;
  errorBudgetRemainingPct: number | null;
  burnRate: number | null;
}

const toChartData = (series: MetricSeriesPoint[]): ChartRow[] =>
  series.map((point) => ({
    timeSec: Math.floor(point.simTimeMs / 1000),
    sliPct: point.sliPct,
    errorBudgetRemainingPct: point.errorBudgetRemainingPct,
    burnRate: point.burnRate
  }));

export const MetricChart = ({ series, title }: MetricChartProps): JSX.Element => {
  const data = toChartData(series);

  return (
    <section className="panel chart-panel reveal">
      <h3>{title}</h3>
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 16, right: 32, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(18, 59, 72, 0.15)" />
            <XAxis dataKey="timeSec" stroke="#194f63" tick={{ fontSize: 12 }} unit="s" />
            <YAxis
              yAxisId="pct"
              domain={[0, 100]}
              stroke="#194f63"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="burn"
              orientation="right"
              domain={[0, 'auto']}
              stroke="#8b2e2e"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: unknown, name) => {
                if (value === null || value === undefined) {
                  return ['N/A', name];
                }

                if (Array.isArray(value)) {
                  return [String(value[0] ?? 'N/A'), name];
                }

                if (typeof value !== 'number') {
                  return [String(value), name];
                }

                if (name === 'Burn rate') {
                  return [`${value.toFixed(2)}x`, name];
                }

                return [`${value.toFixed(2)}%`, name];
              }}
            />
            <Legend />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="sliPct"
              name="SLI"
              stroke="#1d7ad8"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="errorBudgetRemainingPct"
              name="Budget remaining"
              stroke="#f27a29"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="burn"
              type="monotone"
              dataKey="burnRate"
              name="Burn rate"
              stroke="#d64242"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
