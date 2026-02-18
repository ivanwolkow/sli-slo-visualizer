export type SpeedMultiplier = 1 | 10 | 60;

export interface LatencyBucket {
  id: string;
  percentage: number;
  latencyMs: number;
}

export interface SliMetricConfig {
  id: string;
  name: string;
  thresholdMs: number;
  windowSec: number;
  burnWindowSec: number;
  sloTargetPct: number;
}

export interface SimulationConfig {
  rps: number;
  speedMultiplier: SpeedMultiplier;
  tickMs: number;
  buckets: LatencyBucket[];
  metrics: SliMetricConfig[];
}

export interface MetricSnapshot {
  simTimeMs: number;
  sliPct: number | null;
  errorBudgetRemainingPct: number | null;
  burnRate: number | null;
  goodCount: number;
  totalCount: number;
  burnGoodCount: number;
  burnTotalCount: number;
}

export interface MetricSeriesPoint {
  simTimeMs: number;
  sliPct: number | null;
  errorBudgetRemainingPct: number | null;
  burnRate: number | null;
}

export interface MetricRuntime {
  config: SliMetricConfig;
  snapshot: MetricSnapshot;
  series: MetricSeriesPoint[];
}

export interface SimulationSnapshot {
  simTimeMs: number;
  totalStarted: number;
  totalCompleted: number;
  metrics: Record<string, MetricSnapshot>;
  chartSeries: Record<string, MetricSeriesPoint[]>;
}
