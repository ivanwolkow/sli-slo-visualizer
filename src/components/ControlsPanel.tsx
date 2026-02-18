import type { SpeedMultiplier } from '../domain/types';

interface ControlsPanelProps {
  rps: number;
  speedMultiplier: SpeedMultiplier;
  status: 'idle' | 'running' | 'paused';
  simTimeMs: number;
  totalStarted: number;
  onRpsChange: (rps: number) => void;
  onSpeedChange: (speed: SpeedMultiplier) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

const formatSimTime = (simTimeMs: number): string => {
  const totalSeconds = Math.floor(simTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const ControlsPanel = ({
  rps,
  speedMultiplier,
  status,
  simTimeMs,
  totalStarted,
  onRpsChange,
  onSpeedChange,
  onStart,
  onPause,
  onReset
}: ControlsPanelProps): JSX.Element => {
  return (
    <section className="panel reveal">
      <h2>Simulation Controls</h2>
      <div className="controls-grid">
        <label className="field">
          <span>Requests per second</span>
          <input
            aria-label="Requests per second"
            type="number"
            min={1}
            max={1000}
            value={rps}
            onChange={(event) => onRpsChange(Number(event.target.value))}
          />
        </label>

        <label className="field range-field">
          <span>RPS slider</span>
          <input
            aria-label="RPS slider"
            type="range"
            min={1}
            max={1000}
            value={rps}
            onChange={(event) => onRpsChange(Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Simulation speed</span>
          <select
            aria-label="Simulation speed"
            value={speedMultiplier}
            onChange={(event) => onSpeedChange(Number(event.target.value) as SpeedMultiplier)}
          >
            <option value={1}>1x</option>
            <option value={10}>10x</option>
            <option value={60}>60x</option>
          </select>
        </label>
      </div>

      <div className="button-row">
        {status === 'running' ? (
          <button type="button" className="btn-secondary" onClick={onPause}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={onStart}>
            Start
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <span className="label">Status</span>
          <span className={`pill status-${status}`}>{status.toUpperCase()}</span>
        </div>
        <div className="stat-item">
          <span className="label">Simulated time</span>
          <span className="value">{formatSimTime(simTimeMs)}</span>
        </div>
        <div className="stat-item">
          <span className="label">Requests sent</span>
          <span className="value">{totalStarted.toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
};
