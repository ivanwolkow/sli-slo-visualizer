import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import {
  allocateForNewBucketEvenSteal,
  rebalanceWithSelectedBucket,
  redistributeAfterRemoval
} from '../domain/distribution';
import type { LatencyBucket } from '../domain/types';
import { LatencyDistributionEditor } from './LatencyDistributionEditor';

const initialBuckets = (): LatencyBucket[] => [
  { id: 'a', percentage: 70, latencyMs: 500 },
  { id: 'b', percentage: 20, latencyMs: 900 },
  { id: 'c', percentage: 10, latencyMs: 1100 }
];

const totalTextMatcher = /Total percentage: 100%/i;

const Harness = (): JSX.Element => {
  const [buckets, setBuckets] = useState<LatencyBucket[]>(initialBuckets());

  return (
    <LatencyDistributionEditor
      buckets={buckets}
      errors={[]}
      onAddBucket={() => {
        setBuckets((prev) =>
          allocateForNewBucketEvenSteal(prev, {
            id: `new-${prev.length}`,
            percentage: 0,
            latencyMs: 1000
          })
        );
      }}
      onSetBucketPercentage={(id, percentage) => {
        setBuckets((prev) => rebalanceWithSelectedBucket(prev, id, percentage));
      }}
      onSetBucketLatency={(id, latencyMs) => {
        setBuckets((prev) =>
          prev.map((bucket) => (bucket.id === id ? { ...bucket, latencyMs } : bucket))
        );
      }}
      onRemoveBucket={(id) => {
        setBuckets((prev) => redistributeAfterRemoval(prev, id));
      }}
    />
  );
};

describe('LatencyDistributionEditor', () => {
  it('updates selected bucket via slider and keeps total at 100', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const firstSlider = screen.getByLabelText('Bucket 1 percentage slider');
    await user.clear(screen.getByLabelText('Bucket 1 percentage input'));
    await user.type(screen.getByLabelText('Bucket 1 percentage input'), '80');

    expect((firstSlider as HTMLInputElement).value).toBe('80');
    expect((screen.getByLabelText('Bucket 2 percentage input') as HTMLInputElement).value).toBe('13');
    expect((screen.getByLabelText('Bucket 3 percentage input') as HTMLInputElement).value).toBe('7');
    expect(screen.getByText(totalTextMatcher)).toBeInTheDocument();
  });

  it('disables percentage controls in single bucket mode', () => {
    render(
      <LatencyDistributionEditor
        buckets={[{ id: 'single', percentage: 100, latencyMs: 1000 }]}
        errors={[]}
        onAddBucket={() => undefined}
        onSetBucketPercentage={() => undefined}
        onSetBucketLatency={() => undefined}
        onRemoveBucket={() => undefined}
      />
    );

    expect(screen.getByLabelText('Bucket 1 percentage slider')).toBeDisabled();
    expect(screen.getByLabelText('Bucket 1 percentage input')).toBeDisabled();
  });

  it('keeps total at 100 when adding and removing buckets', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Add bucket' }));
    expect(screen.getByText(totalTextMatcher)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(screen.getByText(totalTextMatcher)).toBeInTheDocument();
  });
});
