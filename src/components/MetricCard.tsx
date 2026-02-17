import { getBurnRateStatus } from '../domain/calculations';
import type { MetricSnapshot, SliMetricConfig } from '../domain/types';

interface MetricCardProps {
  metric: SliMetricConfig;
  snapshot: MetricSnapshot;
}

const formatPercentage = (value: number | null): string => {
  if (value === null) {
    return 'N/A';
  }

  return `${value.toFixed(2)}%`;
};

const formatBurnRate = (value: number | null): string => {
  if (value === null) {
    return 'N/A';
  }

  if (!Number.isFinite(value)) {
    return 'INF';
  }

  return `${value.toFixed(2)}x`;
};

export const MetricCard = ({ metric, snapshot }: MetricCardProps): JSX.Element => {
  const burnStatus = getBurnRateStatus(snapshot.burnRate);

  return (
    <article className="metric-card reveal">
      <header className="metric-card-header">
        <h3>{metric.name}</h3>
        <span className={`pill burn-${burnStatus}`}>Burn {burnStatus.toUpperCase()}</span>
      </header>

      <dl className="metric-values">
        <div>
          <dt>SLI</dt>
          <dd>{formatPercentage(snapshot.sliPct)}</dd>
        </div>
        <div>
          <dt>Error budget remaining</dt>
          <dd>{formatPercentage(snapshot.errorBudgetRemainingPct)}</dd>
        </div>
        <div>
          <dt>Burn rate</dt>
          <dd>{formatBurnRate(snapshot.burnRate)}</dd>
        </div>
        <div>
          <dt>Window counts</dt>
          <dd>
            {snapshot.goodCount.toLocaleString()} / {snapshot.totalCount.toLocaleString()}
          </dd>
        </div>
      </dl>
    </article>
  );
};
