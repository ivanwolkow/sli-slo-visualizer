import {
  computeBurnRate,
  computeErrorBudgetRemainingPct,
  computeSliPct
} from '../domain/calculations';
import type {
  LatencyBucket,
  MetricSeriesPoint,
  MetricSnapshot,
  SimulationConfig,
  SimulationSnapshot,
  SliMetricConfig
} from '../domain/types';

const BIN_MS = 100;
const CHART_RETENTION_MS = 10 * 60 * 1000;
const FALLBACK_LATENCY_MS = 1000;

interface CompletionEvent {
  completionTimeMs: number;
  latencyMs: number;
}

type CompareFn<T> = (a: T, b: T) => number;

type EngineUpdateCallback = (snapshot: SimulationSnapshot) => void;

const mod = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;

class MinHeap<T> {
  private readonly items: T[] = [];

  public constructor(private readonly compare: CompareFn<T>) {}

  public clear(): void {
    this.items.length = 0;
  }

  public peek(): T | undefined {
    return this.items[0];
  }

  public push(value: T): void {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  public pop(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const root = this.items[0];
    const tail = this.items.pop();

    if (this.items.length > 0 && tail !== undefined) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }

    return root;
  }

  private bubbleUp(startIndex: number): void {
    let index = startIndex;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
        break;
      }

      [this.items[index], this.items[parentIndex]] = [this.items[parentIndex], this.items[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(startIndex: number): void {
    let index = startIndex;

    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;

      if (
        leftIndex < this.items.length &&
        this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = leftIndex;
      }

      if (
        rightIndex < this.items.length &&
        this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === index) {
        break;
      }

      [this.items[index], this.items[smallestIndex]] = [this.items[smallestIndex], this.items[index]];
      index = smallestIndex;
    }
  }
}

export class SlidingWindowMetricState {
  private metric: SliMetricConfig;
  private readonly windowBins: number;
  private readonly goodBins: number[];
  private readonly totalBins: number[];
  private rollingGood = 0;
  private rollingTotal = 0;
  private currentBin: number;
  private readonly series: MetricSeriesPoint[] = [];

  public constructor(metric: SliMetricConfig, initialSimTimeMs: number) {
    this.metric = metric;
    this.windowBins = Math.max(1, Math.ceil((metric.windowSec * 1000) / BIN_MS));
    this.goodBins = new Array<number>(this.windowBins).fill(0);
    this.totalBins = new Array<number>(this.windowBins).fill(0);
    this.currentBin = Math.floor(initialSimTimeMs / BIN_MS);
  }

  public getId(): string {
    return this.metric.id;
  }

  public advanceTo(simTimeMs: number): void {
    const targetBin = Math.floor(simTimeMs / BIN_MS);

    if (targetBin <= this.currentBin) {
      return;
    }

    for (let bin = this.currentBin + 1; bin <= targetBin; bin += 1) {
      const index = mod(bin, this.windowBins);
      this.rollingGood -= this.goodBins[index];
      this.rollingTotal -= this.totalBins[index];
      this.goodBins[index] = 0;
      this.totalBins[index] = 0;
    }

    this.currentBin = targetBin;
  }

  public recordLatency(completionTimeMs: number, latencyMs: number): void {
    const completionBin = Math.floor(completionTimeMs / BIN_MS);
    const oldestAllowedBin = this.currentBin - this.windowBins + 1;

    if (completionBin < oldestAllowedBin) {
      return;
    }

    const index = mod(completionBin, this.windowBins);
    this.totalBins[index] += 1;
    this.rollingTotal += 1;

    if (latencyMs <= this.metric.thresholdMs) {
      this.goodBins[index] += 1;
      this.rollingGood += 1;
    }
  }

  public getSnapshot(simTimeMs: number): MetricSnapshot {
    const sliPct = computeSliPct(this.rollingGood, this.rollingTotal);
    const errorBudgetRemainingPct = computeErrorBudgetRemainingPct(sliPct, this.metric.sloTargetPct);
    const burnRate = computeBurnRate(sliPct, this.metric.sloTargetPct);

    return {
      simTimeMs,
      sliPct,
      errorBudgetRemainingPct,
      burnRate,
      goodCount: this.rollingGood,
      totalCount: this.rollingTotal
    };
  }

  public appendSeriesPoint(simTimeMs: number): void {
    const snapshot = this.getSnapshot(simTimeMs);
    this.series.push({
      simTimeMs,
      sliPct: snapshot.sliPct,
      errorBudgetRemainingPct: snapshot.errorBudgetRemainingPct,
      burnRate: snapshot.burnRate
    });

    this.trimSeries(simTimeMs);
  }

  public getSeries(): MetricSeriesPoint[] {
    return this.series;
  }

  private trimSeries(simTimeMs: number): void {
    while (
      this.series.length > 0 &&
      simTimeMs - this.series[0].simTimeMs > CHART_RETENTION_MS
    ) {
      this.series.shift();
    }
  }
}

export const buildBucketSampler = (buckets: LatencyBucket[]): (() => number) => {
  const validBuckets = buckets
    .filter((bucket) => bucket.percentage > 0 && Number.isFinite(bucket.latencyMs) && bucket.latencyMs > 0)
    .map((bucket) => ({ percentage: bucket.percentage, latencyMs: bucket.latencyMs }));

  const totalPercentage = validBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0);

  if (totalPercentage <= 0) {
    return () => FALLBACK_LATENCY_MS;
  }

  const cumulative: Array<{ threshold: number; latencyMs: number }> = [];
  let running = 0;

  validBuckets.forEach((bucket) => {
    running += bucket.percentage / totalPercentage;
    cumulative.push({ threshold: running, latencyMs: bucket.latencyMs });
  });

  cumulative[cumulative.length - 1].threshold = 1;

  return () => {
    const randomValue = Math.random();
    const selected = cumulative.find((item) => randomValue <= item.threshold);
    return selected?.latencyMs ?? cumulative[cumulative.length - 1].latencyMs;
  };
};

const areMetricsEquivalent = (left: SliMetricConfig[], right: SliMetricConfig[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((metric, index) => {
    const other = right[index];

    return (
      metric.id === other.id &&
      metric.name === other.name &&
      metric.thresholdMs === other.thresholdMs &&
      metric.windowSec === other.windowSec &&
      metric.sloTargetPct === other.sloTargetPct
    );
  });
};

export class SimulationEngine {
  private config: SimulationConfig;
  private readonly completionEvents = new MinHeap<CompletionEvent>(
    (a, b) => a.completionTimeMs - b.completionTimeMs
  );
  private readonly metricStates = new Map<string, SlidingWindowMetricState>();
  private arrivalAccumulator = 0;
  private simTimeMs = 0;
  private totalStarted = 0;
  private totalCompleted = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private bucketSampler: () => number;
  private onUpdate: EngineUpdateCallback | null;
  private lastSeriesSecond = 0;

  public constructor(config: SimulationConfig, onUpdate?: EngineUpdateCallback) {
    this.config = config;
    this.onUpdate = onUpdate ?? null;
    this.bucketSampler = buildBucketSampler(config.buckets);
    this.rebuildMetricStates();
    this.seedSeriesAtZero();
  }

  public start(): void {
    if (this.ticker !== null) {
      return;
    }

    this.ticker = setInterval(() => {
      this.tick();
    }, this.config.tickMs);
  }

  public pause(): void {
    if (this.ticker === null) {
      return;
    }

    clearInterval(this.ticker);
    this.ticker = null;
  }

  public destroy(): void {
    this.pause();
    this.onUpdate = null;
  }

  public reset(): void {
    this.pause();
    this.arrivalAccumulator = 0;
    this.simTimeMs = 0;
    this.totalStarted = 0;
    this.totalCompleted = 0;
    this.lastSeriesSecond = 0;
    this.completionEvents.clear();
    this.rebuildMetricStates();
    this.seedSeriesAtZero();
    this.publish();
  }

  public updateConfig(nextConfig: SimulationConfig): void {
    const metricsChanged = !areMetricsEquivalent(this.config.metrics, nextConfig.metrics);
    const tickMsChanged = this.config.tickMs !== nextConfig.tickMs;
    const wasRunning = this.ticker !== null;

    this.config = nextConfig;
    this.bucketSampler = buildBucketSampler(nextConfig.buckets);

    if (metricsChanged) {
      this.rebuildMetricStates();
      this.seedSeriesAtZero();
    }

    if (tickMsChanged && wasRunning) {
      this.pause();
      this.start();
    }

    this.publish();
  }

  public getSnapshot(): SimulationSnapshot {
    this.advanceMetricStates(this.simTimeMs);

    const metrics: Record<string, MetricSnapshot> = {};
    const chartSeries: Record<string, MetricSeriesPoint[]> = {};

    this.metricStates.forEach((state, metricId) => {
      metrics[metricId] = state.getSnapshot(this.simTimeMs);
      chartSeries[metricId] = [...state.getSeries()];
    });

    return {
      simTimeMs: this.simTimeMs,
      totalStarted: this.totalStarted,
      totalCompleted: this.totalCompleted,
      metrics,
      chartSeries
    };
  }

  private tick(): void {
    for (let step = 0; step < this.config.speedMultiplier; step += 1) {
      this.runSimStep(this.config.tickMs);
    }

    this.publish();
  }

  private runSimStep(simStepMs: number): void {
    const stepStartMs = this.simTimeMs;
    const stepEndMs = stepStartMs + simStepMs;

    this.generateArrivals(stepStartMs, simStepMs);
    this.advanceMetricStates(stepEndMs);
    this.processCompletions(stepEndMs);

    this.simTimeMs = stepEndMs;
    this.maybeAppendSeries();
  }

  private generateArrivals(stepStartMs: number, simStepMs: number): void {
    const expectedArrivals = (this.config.rps * simStepMs) / 1000 + this.arrivalAccumulator;
    const arrivals = Math.floor(expectedArrivals);
    this.arrivalAccumulator = expectedArrivals - arrivals;

    for (let index = 0; index < arrivals; index += 1) {
      const arrivalOffset = Math.random() * simStepMs;
      const arrivalTimeMs = stepStartMs + arrivalOffset;
      const latencyMs = this.bucketSampler();

      this.completionEvents.push({
        completionTimeMs: arrivalTimeMs + latencyMs,
        latencyMs
      });
    }

    this.totalStarted += arrivals;
  }

  private processCompletions(stepEndMs: number): void {
    while (true) {
      const nextEvent = this.completionEvents.peek();
      if (nextEvent === undefined || nextEvent.completionTimeMs > stepEndMs) {
        break;
      }

      const completion = this.completionEvents.pop();
      if (completion === undefined) {
        break;
      }

      this.totalCompleted += 1;
      this.metricStates.forEach((state) => {
        state.recordLatency(completion.completionTimeMs, completion.latencyMs);
      });
    }
  }

  private advanceMetricStates(simTimeMs: number): void {
    this.metricStates.forEach((state) => {
      state.advanceTo(simTimeMs);
    });
  }

  private maybeAppendSeries(): void {
    const currentSecond = Math.floor(this.simTimeMs / 1000);

    if (currentSecond <= this.lastSeriesSecond) {
      return;
    }

    this.metricStates.forEach((state) => {
      state.appendSeriesPoint(this.simTimeMs);
    });

    this.lastSeriesSecond = currentSecond;
  }

  private rebuildMetricStates(): void {
    this.metricStates.clear();
    this.config.metrics.forEach((metric) => {
      this.metricStates.set(metric.id, new SlidingWindowMetricState(metric, this.simTimeMs));
    });
  }

  private seedSeriesAtZero(): void {
    this.metricStates.forEach((state) => {
      state.appendSeriesPoint(this.simTimeMs);
    });
  }

  private publish(): void {
    if (this.onUpdate === null) {
      return;
    }

    this.onUpdate(this.getSnapshot());
  }
}
