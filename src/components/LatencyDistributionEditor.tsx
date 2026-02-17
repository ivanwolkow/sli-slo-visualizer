import type { LatencyBucket } from '../domain/types';

interface LatencyDistributionEditorProps {
  buckets: LatencyBucket[];
  errors: string[];
  onAddBucket: () => void;
  onSetBucketPercentage: (id: string, percentage: number) => void;
  onSetBucketLatency: (id: string, latencyMs: number) => void;
  onRemoveBucket: (id: string) => void;
}

const formatTotalPercentage = (buckets: LatencyBucket[]): string =>
  buckets.reduce((sum, bucket) => sum + bucket.percentage, 0).toString();

export const LatencyDistributionEditor = ({
  buckets,
  errors,
  onAddBucket,
  onSetBucketPercentage,
  onSetBucketLatency,
  onRemoveBucket
}: LatencyDistributionEditorProps): JSX.Element => {
  const totalPercentage = formatTotalPercentage(buckets);
  const isSingleBucket = buckets.length <= 1;

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
          {buckets.map((bucket, index) => (
            <tr key={bucket.id}>
              <td className="percentage-cell">
                <div className="percentage-controls">
                  <input
                    aria-label={`Bucket ${index + 1} percentage slider`}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={bucket.percentage}
                    disabled={isSingleBucket}
                    onChange={(event) => {
                      onSetBucketPercentage(bucket.id, Number(event.target.value));
                    }}
                  />
                  <input
                    aria-label={`Bucket ${index + 1} percentage input`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={bucket.percentage}
                    disabled={isSingleBucket}
                    onChange={(event) => {
                      onSetBucketPercentage(bucket.id, Number(event.target.value));
                    }}
                  />
                </div>
              </td>
              <td>
                <input
                  aria-label={`Bucket ${index + 1} latency input`}
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={bucket.latencyMs}
                  onChange={(event) => {
                    onSetBucketLatency(bucket.id, Number(event.target.value));
                  }}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onRemoveBucket(bucket.id)}
                  disabled={isSingleBucket}
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
