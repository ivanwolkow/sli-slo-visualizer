import { render, screen } from '@testing-library/react';
import type { MetricSnapshot, SliMetricConfig } from '../domain/types';
import { MetricCard } from './MetricCard';

const metric: SliMetricConfig = {
  id: 'metric-a',
  name: 'Availability',
  thresholdMs: 1000,
  windowSec: 60,
  burnWindowSec: 5,
  sloTargetPct: 99
};

const createSnapshot = (errorBudgetRemainingPct: number | null): MetricSnapshot => ({
  simTimeMs: 10_000,
  sliPct: 99.5,
  errorBudgetRemainingPct,
  burnRate: 0.8,
  goodCount: 1200,
  totalCount: 1220,
  burnGoodCount: 100,
  burnTotalCount: 105
});

describe('MetricCard', () => {
  it('renders numeric percentage and meter semantics for finite value', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot(72.34)} />);

    expect(screen.getByText('72.34%')).toBeInTheDocument();

    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuenow', '72.34');

    const fill = meter.querySelector('.budget-bar-fill-green');
    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle('width: 72.34%');
  });

  it.each([
    { value: 35, expectedClass: 'budget-bar-fill-yellow' },
    { value: 10, expectedClass: 'budget-bar-fill-red' }
  ])('maps budget value $value to $expectedClass', ({ value, expectedClass }) => {
    render(<MetricCard metric={metric} snapshot={createSnapshot(value)} />);

    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    expect(meter.querySelector(`.${expectedClass}`)).not.toBeNull();
  });

  it('renders exhausted budget as red fill with zero width', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot(0)} />);

    expect(screen.getByText('0.00%')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    const fill = meter.querySelector('.budget-bar-fill-red');
    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle('width: 0%');
  });

  it('renders NA meter state when budget is null', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot(null)} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    expect(meter).toHaveClass('budget-bar-track-na');
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available');
    expect(meter).not.toHaveAttribute('aria-valuenow');
    expect(meter.querySelector('.budget-bar-fill-na')).not.toBeNull();
  });
});
