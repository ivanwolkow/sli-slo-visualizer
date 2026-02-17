import type { LatencyBucket, SliMetricConfig } from './types';

export const BUCKET_SUM_EPSILON = 0.001;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const toFiniteNumber = (value: number): boolean => Number.isFinite(value);

export const validateLatencyBuckets = (buckets: LatencyBucket[]): ValidationResult => {
  const errors: string[] = [];

  if (buckets.length === 0) {
    errors.push('At least one latency bucket is required.');
  }

  let totalPercentage = 0;

  buckets.forEach((bucket, index) => {
    if (!toFiniteNumber(bucket.percentage) || bucket.percentage < 0) {
      errors.push(`Bucket #${index + 1} percentage must be a non-negative number.`);
    }

    if (!toFiniteNumber(bucket.latencyMs) || bucket.latencyMs <= 0) {
      errors.push(`Bucket #${index + 1} latency must be greater than 0 ms.`);
    }

    totalPercentage += bucket.percentage;
  });

  if (Math.abs(totalPercentage - 100) > BUCKET_SUM_EPSILON) {
    errors.push(`Bucket percentages must add up to 100%. Current total: ${totalPercentage.toFixed(3)}%.`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
};

export const validateSliMetric = (metric: SliMetricConfig): ValidationResult => {
  const errors: string[] = [];

  if (!metric.name.trim()) {
    errors.push('Metric name is required.');
  }

  if (!toFiniteNumber(metric.thresholdMs) || metric.thresholdMs < 1 || metric.thresholdMs > 5000) {
    errors.push('Threshold must be between 1 and 5000 ms.');
  }

  if (!toFiniteNumber(metric.windowSec) || metric.windowSec < 10 || metric.windowSec > 600) {
    errors.push('Window must be between 10 and 600 seconds.');
  }

  if (!toFiniteNumber(metric.sloTargetPct) || metric.sloTargetPct < 90 || metric.sloTargetPct > 99.99) {
    errors.push('SLO target must be between 90 and 99.99 percent.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
};

export const validateSliMetrics = (metrics: SliMetricConfig[]): ValidationResult => {
  const errors: string[] = [];

  if (metrics.length === 0) {
    errors.push('At least one SLI metric is required.');
  }

  metrics.forEach((metric, index) => {
    const metricValidation = validateSliMetric(metric);
    metricValidation.errors.forEach((error) => {
      errors.push(`Metric #${index + 1}: ${error}`);
    });
  });

  return {
    ok: errors.length === 0,
    errors
  };
};
