import { getBurnRateStatus, getErrorBudgetStatus } from '../domain/calculations';
import type { MetricSnapshot, SliMetricConfig } from '../domain/types';

interface MetricCardProps {
  metric: SliMetricConfig;
  snapshot: MetricSnapshot;
}

interface BudgetBarModel {
  widthPct: number;
  fillVariant: 'green' | 'yellow' | 'red' | 'na';
  isNa: boolean;
  meterValueNow?: number;
  meterValueText?: string;
}

const clampPct = (value: number): number => Math.min(100, Math.max(0, value));

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

const toBudgetBarModel = (
  errorBudgetRemainingPct: number | null,
  budgetStatus: ReturnType<typeof getErrorBudgetStatus>
): BudgetBarModel => {
  if (errorBudgetRemainingPct === null || !Number.isFinite(errorBudgetRemainingPct)) {
    return {
      widthPct: 0,
      fillVariant: 'na',
      isNa: true,
      meterValueText: 'Not available'
    };
  }

  const widthPct = clampPct(errorBudgetRemainingPct);
  const fillVariant =
    budgetStatus === 'exhausted'
      ? 'red'
      : budgetStatus === 'green' || budgetStatus === 'yellow' || budgetStatus === 'red'
        ? budgetStatus
        : 'na';

  return {
    widthPct,
    fillVariant,
    isNa: false,
    meterValueNow: Number(widthPct.toFixed(2))
  };
};

export const MetricCard = ({ metric, snapshot }: MetricCardProps): JSX.Element => {
  const burnStatus = getBurnRateStatus(snapshot.burnRate);
  const budgetStatus = getErrorBudgetStatus(snapshot.errorBudgetRemainingPct);
  const budgetBar = toBudgetBarModel(snapshot.errorBudgetRemainingPct, budgetStatus);

  return (
    <article className="metric-card reveal">
      <header className="metric-card-header">
        <h3>{metric.name}</h3>
        <div className="metric-status-pills">
          <span className={`pill burn-${burnStatus}`}>Burn {burnStatus.toUpperCase()}</span>
          <span className={`pill budget-${budgetStatus}`}>Budget {budgetStatus.toUpperCase()}</span>
        </div>
      </header>

      <dl className="metric-values">
        <div>
          <dt>SLI</dt>
          <dd>{formatPercentage(snapshot.sliPct)}</dd>
        </div>
        <div>
          <dt>Error budget remaining</dt>
          <dd>
            <div className="metric-budget-reading">
              <span className="metric-budget-number">
                {formatPercentage(snapshot.errorBudgetRemainingPct)}
              </span>
              <div
                className={`budget-bar-track${budgetBar.isNa ? ' budget-bar-track-na' : ''}`}
                role="meter"
                aria-label={`${metric.name} error budget remaining`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={budgetBar.meterValueNow}
                aria-valuetext={budgetBar.meterValueText}
              >
                <span
                  className={`budget-bar-fill budget-bar-fill-${budgetBar.fillVariant}`}
                  style={{ width: `${budgetBar.widthPct}%` }}
                />
              </div>
            </div>
          </dd>
        </div>
        <div>
          <dt>Burn rate</dt>
          <dd>{formatBurnRate(snapshot.burnRate)}</dd>
        </div>
        <div>
          <dt>SLI window counts</dt>
          <dd>
            {snapshot.goodCount.toLocaleString()} / {snapshot.totalCount.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt>Burn window counts</dt>
          <dd>
            {snapshot.burnGoodCount.toLocaleString()} / {snapshot.burnTotalCount.toLocaleString()}
          </dd>
        </div>
      </dl>
    </article>
  );
};
