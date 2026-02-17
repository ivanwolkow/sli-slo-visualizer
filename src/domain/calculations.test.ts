import {
  computeBurnRate,
  computeErrorBudgetRemainingPct,
  computeSliPct,
  getBurnRateStatus
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
  });
});
