import type { LatencyBucket } from './types';
import {
  allocateForNewBucketEvenSteal,
  normalizeIntegerPercentages,
  rebalanceWithSelectedBucket,
  redistributeAfterRemoval
} from './distribution';

const createBuckets = (): LatencyBucket[] => [
  { id: 'a', percentage: 70, latencyMs: 500 },
  { id: 'b', percentage: 20, latencyMs: 900 },
  { id: 'c', percentage: 10, latencyMs: 1100 }
];

const sum = (buckets: LatencyBucket[]): number =>
  buckets.reduce((total, bucket) => total + bucket.percentage, 0);

describe('distribution helpers', () => {
  it('normalizes weights to integer totals with deterministic remainder tie-break', () => {
    expect(normalizeIntegerPercentages([1, 1, 1], 100)).toEqual([34, 33, 33]);
    expect(normalizeIntegerPercentages([2, 1], 100)).toEqual([67, 33]);
  });

  it('rebalances other buckets proportionally when one bucket is edited', () => {
    const adjusted = rebalanceWithSelectedBucket(createBuckets(), 'a', 80);

    expect(adjusted.map((bucket) => bucket.percentage)).toEqual([80, 13, 7]);
    expect(sum(adjusted)).toBe(100);
  });

  it('sets all remaining buckets to zero when selected bucket is 100', () => {
    const adjusted = rebalanceWithSelectedBucket(createBuckets(), 'a', 100);

    expect(adjusted.map((bucket) => bucket.percentage)).toEqual([100, 0, 0]);
    expect(sum(adjusted)).toBe(100);
  });

  it('redistributes percentages after removal proportionally', () => {
    const adjusted = redistributeAfterRemoval(createBuckets(), 'b');

    expect(adjusted.map((bucket) => bucket.percentage)).toEqual([88, 12]);
    expect(sum(adjusted)).toBe(100);
  });

  it('adds a new bucket by stealing evenly from existing buckets', () => {
    const next = allocateForNewBucketEvenSteal(createBuckets(), {
      id: 'd',
      percentage: 0,
      latencyMs: 1000
    });

    expect(next.map((bucket) => bucket.percentage)).toEqual([61, 12, 2, 25]);
    expect(sum(next)).toBe(100);
  });

  it('never generates negative percentages for uneven steal edge cases', () => {
    const next = allocateForNewBucketEvenSteal(
      [
        { id: 'a', percentage: 1, latencyMs: 100 },
        { id: 'b', percentage: 0, latencyMs: 200 },
        { id: 'c', percentage: 99, latencyMs: 300 }
      ],
      { id: 'd', percentage: 0, latencyMs: 1000 }
    );

    expect(next.every((bucket) => bucket.percentage >= 0)).toBe(true);
    expect(sum(next)).toBe(100);
  });
});
