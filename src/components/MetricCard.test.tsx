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

const createSnapshot = (patch: Partial<MetricSnapshot> = {}): MetricSnapshot => ({
  simTimeMs: 10_000,
  sliPct: 99.5,
  errorBudgetRemainingPct: 72.34,
  burnRate: 0.8,
  goodCount: 1200,
  totalCount: 1220,
  burnGoodCount: 100,
  burnTotalCount: 105,
  ...patch
});

describe('MetricCard', () => {
  it('renders numeric percentage and meter semantics for finite value', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot()} />);

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
    render(<MetricCard metric={metric} snapshot={createSnapshot({ errorBudgetRemainingPct: value })} />);

    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    expect(meter.querySelector(`.${expectedClass}`)).not.toBeNull();
  });

  it('renders exhausted budget as red fill with zero width', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ errorBudgetRemainingPct: 0 })} />);

    expect(screen.getByText('0.00%')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    const fill = meter.querySelector('.budget-bar-fill-red');
    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle('width: 0%');
  });

  it('renders NA meter state when budget is null', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ errorBudgetRemainingPct: null })} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability error budget remaining' });
    expect(meter).toHaveClass('budget-bar-track-na');
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available');
    expect(meter).not.toHaveAttribute('aria-valuenow');
    expect(meter.querySelector('.budget-bar-fill-na')).not.toBeNull();
  });

  it('renders burn bar semantics for finite green value', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: 0.49 })} />);

    expect(screen.getByText('0.49x')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    expect(meter).toHaveAttribute('aria-valuenow', '0.49');
    expect(meter).toHaveAttribute('aria-valuemax', '3');

    const marker = meter.querySelector('.burn-bar-marker-green') as HTMLElement | null;
    expect(marker).not.toBeNull();
    expect(parseFloat(marker?.style.left ?? '0')).toBeGreaterThan(0);
  });

  it('renders burn yellow marker and ordered threshold positions', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: 1.5 })} />);

    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    expect(meter.querySelector('.burn-bar-marker-yellow')).not.toBeNull();

    const threshold1 = meter.querySelector('.burn-bar-threshold-1x') as HTMLElement | null;
    const threshold2 = meter.querySelector('.burn-bar-threshold-2x') as HTMLElement | null;
    expect(threshold1).not.toBeNull();
    expect(threshold2).not.toBeNull();
    expect(parseFloat(threshold1?.style.left ?? '0')).toBeLessThan(parseFloat(threshold2?.style.left ?? '0'));
  });

  it('renders burn red marker within bar bounds', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: 2.5 })} />);

    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    const marker = meter.querySelector('.burn-bar-marker-red') as HTMLElement | null;
    expect(marker).not.toBeNull();

    const leftPct = parseFloat(marker?.style.left ?? '0');
    expect(leftPct).toBeGreaterThanOrEqual(0);
    expect(leftPct).toBeLessThanOrEqual(100);
  });

  it('applies burn auto-scale for high finite values', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: 7.2 })} />);

    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    expect(meter).toHaveAttribute('aria-valuemax', '8');

    const marker = meter.querySelector('.burn-bar-marker-red') as HTMLElement | null;
    expect(marker).not.toBeNull();
    expect(parseFloat(marker?.style.left ?? '0')).toBeGreaterThan(80);
  });

  it('renders NA burn meter state for null burn rate', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: null })} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    expect(meter).toHaveClass('burn-bar-track-na');
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available');
    expect(meter).not.toHaveAttribute('aria-valuenow');
    expect(meter.querySelector('.burn-bar-marker-na')).not.toBeNull();
  });

  it('renders INF text and NA burn meter for non-finite burn rate', () => {
    render(<MetricCard metric={metric} snapshot={createSnapshot({ burnRate: Number.POSITIVE_INFINITY })} />);

    expect(screen.getByText('INF')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Availability burn rate' });
    expect(meter).toHaveClass('burn-bar-track-na');
    expect(meter).toHaveAttribute('aria-valuetext', 'Not available');
    expect(meter).not.toHaveAttribute('aria-valuenow');
  });
});
