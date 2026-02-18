import type { SliMetricConfig } from '../domain/types';

interface SliMetricsEditorProps {
  metrics: SliMetricConfig[];
  errors: string[];
  onAddMetric: () => void;
  onUpdateMetric: (id: string, patch: Partial<SliMetricConfig>) => void;
  onMoveMetricUp: (id: string) => void;
  onMoveMetricDown: (id: string) => void;
  onRemoveMetric: (id: string) => void;
}

export const SliMetricsEditor = ({
  metrics,
  errors,
  onAddMetric,
  onUpdateMetric,
  onMoveMetricUp,
  onMoveMetricDown,
  onRemoveMetric
}: SliMetricsEditorProps): JSX.Element => {
  return (
    <section className="panel reveal sli-metrics-panel">
      <div className="panel-header">
        <h2>SLI Metrics</h2>
        <button type="button" className="btn-secondary" onClick={onAddMetric}>
          Add metric
        </button>
      </div>

      <table className="editor-table sli-metrics-table">
        <thead>
          <tr>
            <th className="metric-name-col">Name</th>
            <th className="metric-number-col">Threshold (ms)</th>
            <th className="metric-number-col">SLI window (sec)</th>
            <th className="metric-number-col">Burn window (sec)</th>
            <th className="metric-number-col">SLO target (%)</th>
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
                <span className="compact-field-label">Threshold (ms)</span>
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
                <span className="compact-field-label">SLI window (sec)</span>
                <input
                  aria-label="Metric SLI window"
                  type="number"
                  min={10}
                  max={600}
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
              <td className="metric-burn-window-cell">
                <span className="compact-field-label">Burn window (sec)</span>
                <input
                  aria-label="Metric burn window"
                  type="number"
                  min={5}
                  max={600}
                  step={1}
                  value={metric.burnWindowSec}
                  onChange={(event) =>
                    onUpdateMetric(metric.id, {
                      burnWindowSec: Number(event.target.value)
                    })
                  }
                />
              </td>
              <td className="metric-slo-cell">
                <span className="compact-field-label">SLO target (%)</span>
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
