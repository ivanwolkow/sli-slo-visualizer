import {
  computeBurnRate,
  computeErrorBudgetRemainingPct,
  computeSliPct,
  getBurnRateStatus,
  getErrorBudgetStatus
} from './calculations';

describe('calculation formulas', () => {
  it('returns expected values for SLI=100 and SLO=99', () => {
    const budget = computeErrorBudgetRemainingPct(100, 99);
    const burnRate = computeBurnRate(100, 99);

    expect(budget).toBe(100);
    expect(burnRate).toBe(0);
  });

  it('returns expected values for SLI=99 and SLO=99', () => {
    const budget = computeErrorBudgetRemainingPct(99, 99);
    const burnRate = computeBurnRate(99, 99);

    expect(budget).toBe(0);
    expect(burnRate).toBe(1);
  });

  it('returns expected values for SLI=98 and SLO=99', () => {
    const budget = computeErrorBudgetRemainingPct(98, 99);
    const burnRate = computeBurnRate(98, 99);

    expect(budget).toBe(0);
    expect(burnRate).toBe(2);
  });

  it('returns null for empty windows', () => {
    expect(computeSliPct(0, 0)).toBeNull();
    expect(computeErrorBudgetRemainingPct(null, 99)).toBeNull();
    expect(computeBurnRate(null, 99)).toBeNull();
    expect(getBurnRateStatus(null)).toBe('na');
    expect(getErrorBudgetStatus(null)).toBe('na');
  });

  it('supports burn rate > 1 while long-window sli can still be above target', () => {
    const longWindowSli = 95;
    const shortWindowSli = 80;
    const slo = 90;

    const budget = computeErrorBudgetRemainingPct(longWindowSli, slo);
    const burnRate = computeBurnRate(shortWindowSli, slo);

    expect(longWindowSli).toBeGreaterThan(slo);
    expect(budget).toBeGreaterThan(0);
    expect(burnRate).toBeGreaterThan(1);
  });

  it('classifies error budget thresholds for alerting', () => {
    expect(getErrorBudgetStatus(100)).toBe('green');
    expect(getErrorBudgetStatus(50)).toBe('green');
    expect(getErrorBudgetStatus(49.99)).toBe('yellow');
    expect(getErrorBudgetStatus(20)).toBe('yellow');
    expect(getErrorBudgetStatus(19.99)).toBe('red');
    expect(getErrorBudgetStatus(0.01)).toBe('red');
    expect(getErrorBudgetStatus(0)).toBe('exhausted');
  });
});
