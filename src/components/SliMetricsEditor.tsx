import type { SliMetricConfig } from '../domain/types';

interface SliMetricsEditorProps {
  metrics: SliMetricConfig[];
  errors: string[];
  onAddMetric: () => void;
  onSetBurnWindowForAllMetrics: (burnWindowSec: number) => void;
  onUpdateMetric: (id: string, patch: Partial<SliMetricConfig>) => void;
  onMoveMetricUp: (id: string) => void;
  onMoveMetricDown: (id: string) => void;
  onRemoveMetric: (id: string) => void;
}

export const SliMetricsEditor = ({
  metrics,
  errors,
  onAddMetric,
  onSetBurnWindowForAllMetrics,
  onUpdateMetric,
  onMoveMetricUp,
  onMoveMetricDown,
  onRemoveMetric
}: SliMetricsEditorProps): JSX.Element => {
  const uniformBurnWindow = metrics.length > 0 && metrics.every((m) => m.burnWindowSec === metrics[0].burnWindowSec)
    ? String(metrics[0].burnWindowSec)
    : 'custom';

  return (
    <section className="panel reveal sli-metrics-panel">
      <div className="panel-header">
        <h2>SLI Metrics</h2>
        <div className="panel-header-actions">
          <label className="field fluctuation-control">
            <span>Burn window</span>
            <select
              aria-label="Burn window control"
              value={uniformBurnWindow}
              onChange={(event) => onSetBurnWindowForAllMetrics(Number(event.target.value))}
            >
              <option value="5">Short (5s)</option>
              <option value="10">Medium (10s)</option>
              <option value="30">Long (30s)</option>
              <option value="custom" disabled>
                Custom
              </option>
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={onAddMetric}>
            Add metric
          </button>
        </div>
      </div>

      <table className="editor-table sli-metrics-table">
        <thead>
          <tr>
            <th className="metric-name-col">Name</th>
            <th className="metric-number-col">
              <span className="metric-label-main">Threshold</span>
              <span className="metric-label-unit">(ms)</span>
            </th>
            <th className="metric-number-col">
              <span className="metric-label-main">SLI window</span>
              <span className="metric-label-unit">(sec)</span>
            </th>
            <th className="metric-number-col">
              <span className="metric-label-main">SLO target</span>
              <span className="metric-label-unit">(%)</span>
            </th>
            <th className="metric-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, index) => (
            <tr key={metric.id}>
              <td className="metric-name-cell">
                <span className="compact-field-label">Name</span>
                <input
                  aria-label="Metric name"
                  type="text"
                  value={metric.name}
                  onChange={(event) => onUpdateMetric(metric.id, { name: event.target.value })}
                />
              </td>
              <td className="metric-threshold-cell">
                <span className="compact-field-label">
                  <span className="metric-label-main">Threshold</span>
                  <span className="metric-label-unit">(ms)</span>
                </span>
                <input
                  aria-label="Metric threshold"
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  value={metric.thresholdMs}
                  onChange={(event) =>
                    onUpdateMetric(metric.id, {
                      thresholdMs: Number(event.target.value)
                    })
                  }
                />
              </td>
              <td className="metric-window-cell">
                <span className="compact-field-label">
                  <span className="metric-label-main">SLI window</span>
                  <span className="metric-label-unit">(sec)</span>
                </span>
                <input
                  aria-label="Metric SLI window"
                  type="number"
                  min={30}
                  max={3600}
                  step={1}
                  value={metric.windowSec}
                  onChange={(event) => {
                    const nextSliWindow = Number(event.target.value);
                    const nextBurnWindow = Math.min(metric.burnWindowSec, nextSliWindow);

                    onUpdateMetric(metric.id, {
                      windowSec: nextSliWindow,
                      burnWindowSec: nextBurnWindow
                    });
                  }}
                />
              </td>
              <td className="metric-slo-cell">
                <span className="compact-field-label">
                  <span className="metric-label-main">SLO target</span>
                  <span className="metric-label-unit">(%)</span>
                </span>
                <input
                  aria-label="SLO target"
                  type="number"
                  min={90}
                  max={99.99}
                  step={0.01}
                  value={metric.sloTargetPct}
                  onChange={(event) =>
                    onUpdateMetric(metric.id, {
                      sloTargetPct: Number(event.target.value)
                    })
                  }
                />
              </td>
              <td className="metric-actions-cell">
                <span className="compact-field-label">Actions</span>
                <div className="metric-reorder-buttons">
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    aria-label={`Move ${metric.name} up`}
                    onClick={() => onMoveMetricUp(metric.id)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    aria-label={`Move ${metric.name} down`}
                    onClick={() => onMoveMetricDown(metric.id)}
                    disabled={index === metrics.length - 1}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRemoveMetric(metric.id)}
                  disabled={metrics.length <= 1}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {errors.length > 0 && (
        <div className="error-box" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </section>
  );
};
