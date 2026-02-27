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

const CHART_COLORS = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  burnAxis: 'var(--chart-burn-axis)',
  sli: 'var(--chart-sli-line)',
  budget: 'var(--chart-budget-line)',
  burn: 'var(--chart-burn-line)'
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px',
  color: 'var(--chart-tooltip-ink)'
};

const CHART_TOOLTIP_TEXT_STYLE = {
  color: 'var(--chart-tooltip-ink)'
};

const formatLegendItem = (value: string): JSX.Element => <span style={{ color: 'var(--ink)' }}>{value}</span>;

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
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="timeSec"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              unit="s"
            />
            <YAxis
              yAxisId="pct"
              domain={[0, 100]}
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              yAxisId="burn"
              orientation="right"
              domain={[0, 'auto']}
              stroke={CHART_COLORS.burnAxis}
              tick={{ fill: CHART_COLORS.burnAxis, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_TOOLTIP_TEXT_STYLE}
              labelStyle={CHART_TOOLTIP_TEXT_STYLE}
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
            <Legend wrapperStyle={CHART_TOOLTIP_TEXT_STYLE} formatter={formatLegendItem} />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="sliPct"
              name="SLI"
              stroke={CHART_COLORS.sli}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="errorBudgetRemainingPct"
              name="Budget remaining"
              stroke={CHART_COLORS.budget}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              yAxisId="burn"
              type="monotone"
              dataKey="burnRate"
              name="Burn rate"
              stroke={CHART_COLORS.burn}
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
