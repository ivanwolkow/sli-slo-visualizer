import type { SimulationConfig } from '../domain/types';
import { SimulationEngine, buildBucketSampler, SlidingWindowMetricState } from './engine';

const baseConfig: SimulationConfig = {
  rps: 100,
  speedMultiplier: 1,
  tickMs: 100,
  buckets: [
    { id: 'a', percentage: 70, latencyMs: 500 },
    { id: 'b', percentage: 20, latencyMs: 900 },
    { id: 'c', percentage: 10, latencyMs: 1100 }
  ],
  metrics: []
};

describe('engine primitives', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('slides request counts out of the sli window as time advances', () => {
    const metric = new SlidingWindowMetricState(
      {
        id: 'metric-1',
        name: 'm1',
        thresholdMs: 1000,
        windowSec: 1,
        burnWindowSec: 1,
        sloTargetPct: 99
      },
      0
    );

    metric.advanceTo(300);
    metric.recordLatency(100, 500);
    metric.recordLatency(200, 500);
    metric.recordLatency(300, 500);
    const inWindow = metric.getSnapshot(300);
    expect(inWindow.totalCount).toBe(3);

    metric.advanceTo(1300);
    const outOfWindow = metric.getSnapshot(1300);
    expect(outOfWindow.totalCount).toBe(0);
  });

  it('handles boundary completion times consistently', () => {
    const metric = new SlidingWindowMetricState(
      {
        id: 'metric-2',
        name: 'm2',
        thresholdMs: 1000,
        windowSec: 1,
        burnWindowSec: 1,
        sloTargetPct: 99
      },
      0
    );

    metric.recordLatency(0, 500);
    metric.advanceTo(1000);
    metric.recordLatency(1000, 500);

    const snapshot = metric.getSnapshot(1000);
    expect(snapshot.totalCount).toBe(1);
  });

  it('returns N/A burn rate when burn window has no completed requests', () => {
    const metric = new SlidingWindowMetricState(
      {
        id: 'metric-3',
        name: 'm3',
        thresholdMs: 1000,
        windowSec: 60,
        burnWindowSec: 5,
        sloTargetPct: 90
      },
      0
    );

    metric.advanceTo(6000);
    metric.recordLatency(500, 500);

    const snapshot = metric.getSnapshot(6000);
    expect(snapshot.sliPct).not.toBeNull();
    expect(snapshot.burnRate).toBeNull();
  });

  it('can show burn rate above 1 while long SLI is still above target', () => {
    const metric = new SlidingWindowMetricState(
      {
        id: 'metric-4',
        name: 'm4',
        thresholdMs: 1000,
        windowSec: 300,
        burnWindowSec: 5,
        sloTargetPct: 90
      },
      0
    );

    metric.advanceTo(299000);
    for (let t = 0; t < 294000; t += 1000) {
      metric.recordLatency(t, 500);
    }

    for (let t = 295000; t < 300000; t += 250) {
      metric.recordLatency(t, 1200);
    }

    const snapshot = metric.getSnapshot(299000);

    expect(snapshot.sliPct).not.toBeNull();
    expect(snapshot.sliPct!).toBeGreaterThan(90);
    expect(snapshot.burnRate).not.toBeNull();
    expect(snapshot.burnRate!).toBeGreaterThan(1);
  });

  it('samples latency buckets near configured percentages', () => {
    let seed = 123456789;
    const nextRandom = (): number => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };

    vi.spyOn(Math, 'random').mockImplementation(nextRandom);

    const sampler = buildBucketSampler(baseConfig.buckets);
    const totalSamples = 100_000;

    let count500 = 0;
    let count900 = 0;
    let count1100 = 0;

    for (let index = 0; index < totalSamples; index += 1) {
      const sampled = sampler();
      if (sampled === 500) {
        count500 += 1;
      } else if (sampled === 900) {
        count900 += 1;
      } else if (sampled === 1100) {
        count1100 += 1;
      }
    }

    const pct500 = (count500 / totalSamples) * 100;
    const pct900 = (count900 / totalSamples) * 100;
    const pct1100 = (count1100 / totalSamples) * 100;

    expect(pct500).toBeGreaterThan(68.5);
    expect(pct500).toBeLessThan(71.5);
    expect(pct900).toBeGreaterThan(18.5);
    expect(pct900).toBeLessThan(21.5);
    expect(pct1100).toBeGreaterThan(8.5);
    expect(pct1100).toBeLessThan(11.5);
  });

  it('engine snapshot includes burn-window counts', () => {
    const config: SimulationConfig = {
      ...baseConfig,
      metrics: [
        {
          id: 'metric-main',
          name: 'main',
          thresholdMs: 1000,
          windowSec: 30,
          burnWindowSec: 5,
          sloTargetPct: 90
        }
      ]
    };

    const engine = new SimulationEngine(config);
    const snapshot = engine.getSnapshot();

    expect(snapshot.metrics['metric-main'].burnGoodCount).toBe(0);
    expect(snapshot.metrics['metric-main'].burnTotalCount).toBe(0);
  });
});
