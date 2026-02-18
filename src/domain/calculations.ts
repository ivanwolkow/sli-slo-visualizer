const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const computeSliPct = (goodCount: number, totalCount: number): number | null => {
  if (totalCount <= 0) {
    return null;
  }

  return (goodCount / totalCount) * 100;
};

export const computeErrorBudgetRemainingPct = (sliPct: number | null, sloTargetPct: number): number | null => {
  if (sliPct === null) {
    return null;
  }

  const denominator = 100 - sloTargetPct;
  if (denominator <= 0) {
    return sliPct >= 100 ? 100 : 0;
  }

  const normalized = (sliPct - sloTargetPct) / denominator;
  return clamp(normalized, 0, 1) * 100;
};

export const computeBurnRate = (sliPct: number | null, sloTargetPct: number): number | null => {
  if (sliPct === null) {
    return null;
  }

  const allowedBadRatio = (100 - sloTargetPct) / 100;
  if (allowedBadRatio <= 0) {
    return sliPct >= 100 ? 0 : Number.POSITIVE_INFINITY;
  }

  const badRatio = (100 - sliPct) / 100;
  return badRatio / allowedBadRatio;
};

export const getBurnRateStatus = (burnRate: number | null): 'green' | 'yellow' | 'red' | 'na' => {
  if (burnRate === null || !Number.isFinite(burnRate)) {
    return 'na';
  }

  if (burnRate < 1) {
    return 'green';
  }

  if (burnRate <= 2) {
    return 'yellow';
  }

  return 'red';
};

export const getErrorBudgetStatus = (
  errorBudgetRemainingPct: number | null
): 'green' | 'yellow' | 'red' | 'exhausted' | 'na' => {
  if (errorBudgetRemainingPct === null || !Number.isFinite(errorBudgetRemainingPct)) {
    return 'na';
  }

  if (errorBudgetRemainingPct <= 0) {
    return 'exhausted';
  }

  if (errorBudgetRemainingPct < 20) {
    return 'red';
  }

  if (errorBudgetRemainingPct < 50) {
    return 'yellow';
  }

  return 'green';
};
