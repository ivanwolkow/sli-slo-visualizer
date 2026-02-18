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
      burnWindowSec: 1,
      sloTargetPct: 89
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts burn window at minimum and within SLI window', () => {
    const result = validateSliMetric({
      id: 'm2',
      name: 'valid',
      thresholdMs: 1000,
      windowSec: 30,
      burnWindowSec: 5,
      sloTargetPct: 90
    });

    expect(result.ok).toBe(true);
  });

  it('rejects burn window above sli window', () => {
    const result = validateSliMetric({
      id: 'm3',
      name: 'invalid burn',
      thresholdMs: 1000,
      windowSec: 30,
      burnWindowSec: 31,
      sloTargetPct: 90
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Burn window must be less than or equal to SLI window.');
  });
});
