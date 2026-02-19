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

interface BurnBarModel {
  scaleMax: number;
  markerPct: number;
  greenEndPct: number;
  yellowEndPct: number;
  markerVariant: 'green' | 'yellow' | 'red' | 'na';
  isNa: boolean;
  meterValueNow?: number;
  meterValueText?: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const clampPct = (value: number): number => clamp(value, 0, 100);

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

const toBurnBarModel = (
  burnRate: number | null,
  burnStatus: ReturnType<typeof getBurnRateStatus>
): BurnBarModel => {
  const defaultScaleMax = 3;
  const defaultGreenEndPct = (1 / defaultScaleMax) * 100;
  const defaultYellowEndPct = (2 / defaultScaleMax) * 100;

  if (burnRate === null || !Number.isFinite(burnRate)) {
    return {
      scaleMax: defaultScaleMax,
      markerPct: 0,
      greenEndPct: defaultGreenEndPct,
      yellowEndPct: defaultYellowEndPct,
      markerVariant: 'na',
      isNa: true,
      meterValueText: 'Not available'
    };
  }

  const scaleMax = Math.max(defaultScaleMax, Math.ceil(burnRate));
  const greenEndPct = clampPct((1 / scaleMax) * 100);
  const yellowEndPct = clampPct((2 / scaleMax) * 100);
  const rawMarkerPct = clampPct((burnRate / scaleMax) * 100);
  const markerPct = clamp(rawMarkerPct, 1, 99);
  const markerVariant =
    burnStatus === 'green' || burnStatus === 'yellow' || burnStatus === 'red' ? burnStatus : 'na';

  return {
    scaleMax,
    markerPct,
    greenEndPct,
    yellowEndPct,
    markerVariant,
    isNa: false,
    meterValueNow: Number(burnRate.toFixed(2))
  };
};

export const MetricCard = ({ metric, snapshot }: MetricCardProps): JSX.Element => {
  const burnStatus = getBurnRateStatus(snapshot.burnRate);
  const budgetStatus = getErrorBudgetStatus(snapshot.errorBudgetRemainingPct);
  const budgetBar = toBudgetBarModel(snapshot.errorBudgetRemainingPct, budgetStatus);
  const burnBar = toBurnBarModel(snapshot.burnRate, burnStatus);

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
          <dd>
            <div className="metric-burn-reading">
              <span className="metric-burn-number">{formatBurnRate(snapshot.burnRate)}</span>
              <div
                className={`burn-bar-track${burnBar.isNa ? ' burn-bar-track-na' : ''}`}
                role="meter"
                aria-label={`${metric.name} burn rate`}
                aria-valuemin={0}
                aria-valuemax={burnBar.scaleMax}
                aria-valuenow={burnBar.meterValueNow}
                aria-valuetext={burnBar.meterValueText}
              >
                <span
                  className={`burn-bar-zones${burnBar.isNa ? ' burn-bar-zones-na' : ''}`}
                  style={{
                    background: `linear-gradient(90deg, var(--ok) 0 ${burnBar.greenEndPct}%, var(--warn) ${burnBar.greenEndPct}% ${burnBar.yellowEndPct}%, var(--danger) ${burnBar.yellowEndPct}% 100%)`
                  }}
                />
                <span className="burn-bar-threshold burn-bar-threshold-1x" style={{ left: `${burnBar.greenEndPct}%` }} />
                <span className="burn-bar-threshold burn-bar-threshold-2x" style={{ left: `${burnBar.yellowEndPct}%` }} />
                <span
                  className={`burn-bar-marker burn-bar-marker-${burnBar.markerVariant}`}
                  style={{ left: `${burnBar.markerPct}%` }}
                />
              </div>
            </div>
          </dd>
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
