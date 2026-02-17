import type { LatencyBucket } from '../domain/types';

interface LatencyDistributionEditorProps {
  buckets: LatencyBucket[];
  errors: string[];
  onAddBucket: () => void;
  onUpdateBucket: (id: string, patch: Partial<LatencyBucket>) => void;
  onRemoveBucket: (id: string) => void;
}

const formatTotalPercentage = (buckets: LatencyBucket[]): string =>
  buckets.reduce((sum, bucket) => sum + bucket.percentage, 0).toFixed(2);

export const LatencyDistributionEditor = ({
  buckets,
  errors,
  onAddBucket,
  onUpdateBucket,
  onRemoveBucket
}: LatencyDistributionEditorProps): JSX.Element => {
  const totalPercentage = formatTotalPercentage(buckets);

  return (
    <section className="panel reveal">
      <div className="panel-header">
        <h2>Latency Distribution</h2>
        <button type="button" className="btn-secondary" onClick={onAddBucket}>
          Add bucket
        </button>
      </div>

      <table className="editor-table">
        <thead>
          <tr>
            <th>% of requests</th>
            <th>Latency (ms)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.id}>
              <td>
                <input
                  aria-label="Bucket percentage"
                  type="number"
                  min={0}
                  step={0.1}
                  value={bucket.percentage}
                  onChange={(event) => {
                    onUpdateBucket(bucket.id, { percentage: Number(event.target.value) });
                  }}
                />
              </td>
              <td>
                <input
                  aria-label="Bucket latency"
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={bucket.latencyMs}
                  onChange={(event) => {
                    onUpdateBucket(bucket.id, { latencyMs: Number(event.target.value) });
                  }}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRemoveBucket(bucket.id)}
                  disabled={buckets.length <= 1}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="meta-text">Total percentage: {totalPercentage}%</p>
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
