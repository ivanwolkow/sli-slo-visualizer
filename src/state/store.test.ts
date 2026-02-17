import { describe, expect, it, vi } from 'vitest';

const sumPercentages = (buckets: Array<{ percentage: number }>): number =>
  buckets.reduce((acc, bucket) => acc + bucket.percentage, 0);

describe('simulation store bucket balancing', () => {
  const loadStore = async () => {
    const module = await import('./store');
    return module.useSimulationStore;
  };

  it('rebalances percentages when setting a bucket percentage', async () => {
    vi.resetModules();
    const store = await loadStore();

    const [first] = store.getState().config.buckets;
    store.getState().setBucketPercentage(first.id, 70);

    const { buckets } = store.getState().config;
    expect(buckets.map((bucket) => bucket.percentage)).toEqual([70, 30]);
    expect(sumPercentages(buckets)).toBe(100);
    expect(buckets.every((bucket) => bucket.percentage >= 0)).toBe(true);
  });

  it('keeps totals valid when adding and removing buckets', async () => {
    vi.resetModules();
    const store = await loadStore();

    store.getState().addBucket();

    const afterAdd = store.getState().config.buckets;
    expect(afterAdd).toHaveLength(3);
    expect(sumPercentages(afterAdd)).toBe(100);

    const idToRemove = afterAdd[1].id;
    store.getState().removeBucket(idToRemove);

    const afterRemove = store.getState().config.buckets;
    expect(afterRemove).toHaveLength(2);
    expect(sumPercentages(afterRemove)).toBe(100);
    expect(afterRemove.every((bucket) => bucket.percentage >= 0)).toBe(true);
  });

  it('forces single bucket percentage to 100', async () => {
    vi.resetModules();
    const store = await loadStore();

    const only = store.getState().config.buckets[0];
    store.setState((state) => ({
      ...state,
      config: {
        ...state.config,
        buckets: [{ ...only, percentage: 42 }]
      }
    }));

    store.getState().setBucketPercentage(only.id, 5);

    const [single] = store.getState().config.buckets;
    expect(single.percentage).toBe(100);
    expect(sumPercentages(store.getState().config.buckets)).toBe(100);
  });

  it('reorders SLI metrics when move actions are used', async () => {
    vi.resetModules();
    const store = await loadStore();

    const namesBefore = store.getState().config.metrics.map((metric) => metric.name);
    expect(namesBefore).toEqual(['SLI <= 1000ms / 30s', 'SLI <= 1000ms / 60s', 'SLI <= 1000ms / 300s']);

    const firstId = store.getState().config.metrics[0].id;
    store.getState().moveMetricDown(firstId);

    const namesAfterDown = store.getState().config.metrics.map((metric) => metric.name);
    expect(namesAfterDown).toEqual(['SLI <= 1000ms / 60s', 'SLI <= 1000ms / 30s', 'SLI <= 1000ms / 300s']);

    const lastId = store.getState().config.metrics[2].id;
    store.getState().moveMetricUp(lastId);

    const namesAfterUp = store.getState().config.metrics.map((metric) => metric.name);
    expect(namesAfterUp).toEqual(['SLI <= 1000ms / 60s', 'SLI <= 1000ms / 300s', 'SLI <= 1000ms / 30s']);
  });
});
