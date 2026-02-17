import type { LatencyBucket } from './types';

const TOTAL_PERCENT = 100;

const clampInt = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const evenSplitIntegers = (count: number, total: number): number[] => {
  if (count <= 0) {
    return [];
  }

  const clampedTotal = Math.max(0, total);
  const base = Math.floor(clampedTotal / count);
  let remainder = clampedTotal - base * count;

  return new Array<number>(count).fill(base).map((value) => {
    if (remainder > 0) {
      remainder -= 1;
      return value + 1;
    }

    return value;
  });
};

export const normalizeIntegerPercentages = (weights: number[], targetTotal: number): number[] => {
  const total = Math.max(0, Math.round(targetTotal));
  if (weights.length === 0) {
    return [];
  }

  const safeWeights = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const sum = safeWeights.reduce((acc, value) => acc + value, 0);

  if (sum <= 0) {
    return evenSplitIntegers(weights.length, total);
  }

  const rows = safeWeights.map((weight, index) => {
    const exact = (weight / sum) * total;
    const floorValue = Math.floor(exact);

    return {
      index,
      exact,
      floorValue,
      remainder: exact - floorValue
    };
  });

  const result = rows.map((row) => row.floorValue);
  let remaining = total - result.reduce((acc, value) => acc + value, 0);

  const ranked = [...rows].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.index - right.index;
  });

  for (const row of ranked) {
    if (remaining <= 0) {
      break;
    }

    result[row.index] += 1;
    remaining -= 1;
  }

  return result;
};

export const rebalanceWithSelectedBucket = (
  buckets: LatencyBucket[],
  selectedId: string,
  targetPct: number
): LatencyBucket[] => {
  if (buckets.length === 0) {
    return [];
  }

  if (buckets.length === 1) {
    return [{ ...buckets[0], percentage: TOTAL_PERCENT }];
  }

  const selectedIndex = buckets.findIndex((bucket) => bucket.id === selectedId);
  if (selectedIndex === -1) {
    const normalized = normalizeIntegerPercentages(
      buckets.map((bucket) => bucket.percentage),
      TOTAL_PERCENT
    );

    return buckets.map((bucket, index) => ({
      ...bucket,
      percentage: normalized[index]
    }));
  }

  const selectedPct = clampInt(targetPct, 0, TOTAL_PERCENT);
  const remaining = TOTAL_PERCENT - selectedPct;

  const otherBuckets = buckets.filter((_, index) => index !== selectedIndex);
  const normalizedOthers = normalizeIntegerPercentages(
    otherBuckets.map((bucket) => bucket.percentage),
    remaining
  );

  let otherIndex = 0;
  return buckets.map((bucket, index) => {
    if (index === selectedIndex) {
      return { ...bucket, percentage: selectedPct };
    }

    const next = {
      ...bucket,
      percentage: normalizedOthers[otherIndex]
    };
    otherIndex += 1;
    return next;
  });
};

export const redistributeAfterRemoval = (buckets: LatencyBucket[], removedId: string): LatencyBucket[] => {
  const remainingBuckets = buckets.filter((bucket) => bucket.id !== removedId);
  if (remainingBuckets.length === 0) {
    return [];
  }

  if (remainingBuckets.length === 1) {
    return [{ ...remainingBuckets[0], percentage: TOTAL_PERCENT }];
  }

  const normalized = normalizeIntegerPercentages(
    remainingBuckets.map((bucket) => bucket.percentage),
    TOTAL_PERCENT
  );

  return remainingBuckets.map((bucket, index) => ({
    ...bucket,
    percentage: normalized[index]
  }));
};

const stealEvenly = (values: number[], requestedAmount: number): { next: number[]; stolen: number } => {
  const next = [...values];
  let remaining = Math.max(0, Math.round(requestedAmount));

  while (remaining > 0) {
    const eligible = next
      .map((value, index) => ({ value, index }))
      .filter((row) => row.value > 0)
      .map((row) => row.index);

    if (eligible.length === 0) {
      break;
    }

    const base = Math.floor(remaining / eligible.length);
    const extra = remaining % eligible.length;

    let stolenThisRound = 0;
    eligible.forEach((index, pos) => {
      const planned = base + (pos < extra ? 1 : 0);
      const take = Math.min(planned, next[index]);
      next[index] -= take;
      stolenThisRound += take;
    });

    if (stolenThisRound <= 0) {
      break;
    }

    remaining -= stolenThisRound;
  }

  return {
    next,
    stolen: Math.max(0, Math.round(requestedAmount) - remaining)
  };
};

export const allocateForNewBucketEvenSteal = (
  buckets: LatencyBucket[],
  newBucket: LatencyBucket
): LatencyBucket[] => {
  if (buckets.length === 0) {
    return [{ ...newBucket, percentage: TOTAL_PERCENT }];
  }

  const normalizedExisting = normalizeIntegerPercentages(
    buckets.map((bucket) => bucket.percentage),
    TOTAL_PERCENT
  );

  const targetNewPct = Math.round(TOTAL_PERCENT / (buckets.length + 1));
  const { next: existingAfterSteal, stolen } = stealEvenly(normalizedExisting, targetNewPct);

  const adjustedExisting = buckets.map((bucket, index) => ({
    ...bucket,
    percentage: existingAfterSteal[index]
  }));

  return [
    ...adjustedExisting,
    {
      ...newBucket,
      percentage: stolen
    }
  ];
};
