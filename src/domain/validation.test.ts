import { validateLatencyBuckets, validateSliMetric } from './validation';

describe('validation', () => {
  it('accepts bucket totals equal to 100', () => {
    const result = validateLatencyBuckets([
      { id: 'a', percentage: 70, latencyMs: 500 },
      { id: 'b', percentage: 20, latencyMs: 900 },
      { id: 'c', percentage: 10, latencyMs: 1100 }
    ]);

    expect(result.ok).toBe(true);
  });

  it('rejects bucket totals not equal to 100', () => {
    const result = validateLatencyBuckets([
      { id: 'a', percentage: 60, latencyMs: 500 },
      { id: 'b', percentage: 20, latencyMs: 900 }
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes('add up to 100%'))).toBe(true);
  });

  it('rejects invalid SLI values', () => {
    const result = validateSliMetric({
      id: 'm1',
      name: '',
      thresholdMs: 0,
      windowSec: 2,
      sloTargetPct: 89
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
