import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { SliMetricsEditor } from './SliMetricsEditor';
import type { SliMetricConfig } from '../domain/types';

const createMetric = (id: string): SliMetricConfig => ({
  id,
  name: `Metric ${id}`,
  thresholdMs: 1000,
  windowSec: 60,
  burnWindowSec: 5,
  sloTargetPct: 99
});

const moveByOffset = (metrics: SliMetricConfig[], id: string, offset: -1 | 1): SliMetricConfig[] => {
  const index = metrics.findIndex((metric) => metric.id === id);
  if (index < 0) {
    return metrics;
  }

  const target = index + offset;
  if (target < 0 || target >= metrics.length) {
    return metrics;
  }

  const next = [...metrics];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const Harness = (): JSX.Element => {
  const [metrics, setMetrics] = useState<SliMetricConfig[]>([
    createMetric('1'),
    createMetric('2'),
    createMetric('3')
  ]);

  return (
    <SliMetricsEditor
      metrics={metrics}
      errors={[]}
      onAddMetric={() => setMetrics((prev) => [...prev, createMetric(String(prev.length + 1))])}
      onUpdateMetric={(id, patch) =>
        setMetrics((prev) => prev.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)))
      }
      onMoveMetricUp={(id) => setMetrics((prev) => moveByOffset(prev, id, -1))}
      onMoveMetricDown={(id) => setMetrics((prev) => moveByOffset(prev, id, 1))}
      onRemoveMetric={(id) => setMetrics((prev) => prev.filter((metric) => metric.id !== id))}
    />
  );
};

describe('SliMetricsEditor', () => {
  it('adds and removes metric rows', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getAllByLabelText('Metric name')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Add metric' }));
    expect(screen.getAllByLabelText('Metric name')).toHaveLength(4);

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getAllByLabelText('Metric name')).toHaveLength(3);
  });

  it('reorders metrics with up/down controls', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const getOrder = (): string[] =>
      screen.getAllByLabelText('Metric name').map((input) => (input as HTMLInputElement).value);

    expect(getOrder()).toEqual(['Metric 1', 'Metric 2', 'Metric 3']);

    await user.click(screen.getByRole('button', { name: 'Move Metric 1 down' }));
    expect(getOrder()).toEqual(['Metric 2', 'Metric 1', 'Metric 3']);

    await user.click(screen.getByRole('button', { name: 'Move Metric 3 up' }));
    expect(getOrder()).toEqual(['Metric 2', 'Metric 3', 'Metric 1']);

    const firstRow = screen.getAllByRole('row')[1];
    expect(within(firstRow).getByRole('button', { name: 'Move Metric 2 up' })).toBeDisabled();
  });

  it('renders and updates burn window input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const burnWindowInput = screen.getAllByLabelText('Metric burn window')[0];
    await user.clear(burnWindowInput);
    await user.type(burnWindowInput, '8');

    expect((screen.getAllByLabelText('Metric burn window')[0] as HTMLInputElement).value).toBe('8');
  });
});
