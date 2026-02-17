import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { SliMetricsEditor } from './SliMetricsEditor';
import type { SliMetricConfig } from '../domain/types';

const createMetric = (id: string): SliMetricConfig => ({
  id,
  name: `Metric ${id}`,
  thresholdMs: 1000,
  windowSec: 60,
  sloTargetPct: 99
});

const Harness = (): JSX.Element => {
  const [metrics, setMetrics] = useState<SliMetricConfig[]>([createMetric('1')]);

  return (
    <SliMetricsEditor
      metrics={metrics}
      errors={[]}
      onAddMetric={() => setMetrics((prev) => [...prev, createMetric(String(prev.length + 1))])}
      onUpdateMetric={(id, patch) =>
        setMetrics((prev) => prev.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)))
      }
      onRemoveMetric={(id) => setMetrics((prev) => prev.filter((metric) => metric.id !== id))}
    />
  );
};

describe('SliMetricsEditor', () => {
  it('adds and removes metric rows', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getAllByLabelText('Metric name')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Add metric' }));
    expect(screen.getAllByLabelText('Metric name')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getAllByLabelText('Metric name')).toHaveLength(1);
  });
});
