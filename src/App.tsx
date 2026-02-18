import { ControlsPanel } from './components/ControlsPanel';
import { LatencyDistributionEditor } from './components/LatencyDistributionEditor';
import { MetricCard } from './components/MetricCard';
import { MetricChart } from './components/MetricChart';
import { SliMetricsEditor } from './components/SliMetricsEditor';
import type { MetricSnapshot } from './domain/types';
import { useSimulationStore } from './state/store';

const EMPTY_METRIC_SNAPSHOT: MetricSnapshot = {
  simTimeMs: 0,
  sliPct: null,
  errorBudgetRemainingPct: null,
  burnRate: null,
  goodCount: 0,
  totalCount: 0,
  burnGoodCount: 0,
  burnTotalCount: 0
};

const byBucketError = (error: string): boolean => error.startsWith('Bucket') || error.includes('latency bucket');
const byMetricError = (error: string): boolean => error.startsWith('Metric') || error.includes('SLI metric');

function App(): JSX.Element {
  const config = useSimulationStore((state) => state.config);
  const status = useSimulationStore((state) => state.status);
  const validationErrors = useSimulationStore((state) => state.validationErrors);
  const snapshot = useSimulationStore((state) => state.snapshot);

  const setRps = useSimulationStore((state) => state.setRps);
  const setSpeedMultiplier = useSimulationStore((state) => state.setSpeedMultiplier);
  const addBucket = useSimulationStore((state) => state.addBucket);
  const setBucketPercentage = useSimulationStore((state) => state.setBucketPercentage);
  const setBucketLatency = useSimulationStore((state) => state.setBucketLatency);
  const removeBucket = useSimulationStore((state) => state.removeBucket);
  const addMetric = useSimulationStore((state) => state.addMetric);
  const setBurnWindowForAllMetrics = useSimulationStore((state) => state.setBurnWindowForAllMetrics);
  const updateMetric = useSimulationStore((state) => state.updateMetric);
  const moveMetricUp = useSimulationStore((state) => state.moveMetricUp);
  const moveMetricDown = useSimulationStore((state) => state.moveMetricDown);
  const removeMetric = useSimulationStore((state) => state.removeMetric);
  const start = useSimulationStore((state) => state.start);
  const pause = useSimulationStore((state) => state.pause);
  const reset = useSimulationStore((state) => state.reset);

  const bucketErrors = validationErrors.filter(byBucketError);
  const metricErrors = validationErrors.filter(byMetricError);

  return (
    <div className="app-shell">
      <header className="hero reveal">
        <h1>SLI / SLO Visualizer</h1>
        <p>
          Model a request-processing service, define latency SLIs over sliding windows, and observe
          error-budget burn dynamics in real time.
        </p>
      </header>

      <main className="layout">
        <div className="left-column">
          <ControlsPanel
            rps={config.rps}
            speedMultiplier={config.speedMultiplier}
            status={status}
            simTimeMs={snapshot.simTimeMs}
            totalStarted={snapshot.totalStarted}
            onRpsChange={setRps}
            onSpeedChange={setSpeedMultiplier}
            onStart={start}
            onPause={pause}
            onReset={reset}
          />

          <LatencyDistributionEditor
            buckets={config.buckets}
            errors={bucketErrors}
            onAddBucket={addBucket}
            onSetBucketPercentage={setBucketPercentage}
            onSetBucketLatency={setBucketLatency}
            onRemoveBucket={removeBucket}
          />

          <SliMetricsEditor
            metrics={config.metrics}
            errors={metricErrors}
            onAddMetric={addMetric}
            onSetBurnWindowForAllMetrics={setBurnWindowForAllMetrics}
            onUpdateMetric={updateMetric}
            onMoveMetricUp={moveMetricUp}
            onMoveMetricDown={moveMetricDown}
            onRemoveMetric={removeMetric}
          />
        </div>

        <div className="right-column">
          {validationErrors.length > 0 && (
            <div className="error-box reveal" role="alert">
              <h3>Validation issues</h3>
              {validationErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <section className="cards-grid">
            {config.metrics.map((metric) => (
              <MetricCard
                key={metric.id}
                metric={metric}
                snapshot={snapshot.metrics[metric.id] ?? EMPTY_METRIC_SNAPSHOT}
              />
            ))}
          </section>

          <section className="charts-grid">
            {config.metrics.map((metric) => (
              <MetricChart
                key={`chart-${metric.id}`}
                title={`${metric.name} trend`}
                series={snapshot.chartSeries[metric.id] ?? []}
              />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
