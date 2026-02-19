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

const SPEED_OPTIONS: SpeedMultiplier[] = [1, 10, 60];
const RPS_MIN = 1;
const RPS_MAX = 1000;
const RPS_SLIDER_STEPS = 1000;
const RPS_TICKS = [1, 10, 50, 100, 250, 500, 1000];
const LOG_RPS_RANGE = Math.log(RPS_MAX / RPS_MIN);

const sliderValueToRps = (sliderValue: number): number => {
  const ratio = Math.min(Math.max(sliderValue / RPS_SLIDER_STEPS, 0), 1);
  const mapped = RPS_MIN * Math.exp(LOG_RPS_RANGE * ratio);
  return Math.round(mapped);
};

const rpsToSliderValue = (rps: number): number => {
  const clamped = Math.min(Math.max(rps, RPS_MIN), RPS_MAX);
  const ratio = Math.log(clamped / RPS_MIN) / LOG_RPS_RANGE;
  return Math.round(ratio * RPS_SLIDER_STEPS);
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
  const sliderValue = rpsToSliderValue(rps);

  return (
    <section className="panel reveal">
      <h2>Simulation Controls</h2>
      <div className="controls-grid">
        <label className="field range-field rps-field">
          <div className="rps-label-row">
            <span>Requests per second</span>
            <output className="rps-live-value" htmlFor="rps-control">
              {rps.toLocaleString()} rps
            </output>
          </div>
          <input
            id="rps-control"
            aria-label="Requests per second"
            type="range"
            min={0}
            max={RPS_SLIDER_STEPS}
            value={sliderValue}
            list="rps-ticks"
            onChange={(event) => onRpsChange(sliderValueToRps(Number(event.target.value)))}
          />
          <datalist id="rps-ticks">
            {RPS_TICKS.map((tick) => (
              <option key={tick} value={rpsToSliderValue(tick)} />
            ))}
          </datalist>
          <div className="rps-ticks" aria-hidden="true">
            {RPS_TICKS.map((tick) => (
              <span
                key={`tick-${tick}`}
                style={{ left: `${(rpsToSliderValue(tick) / RPS_SLIDER_STEPS) * 100}%` }}
              >
                {tick >= 1000 ? '1k' : tick}
              </span>
            ))}
          </div>
        </label>

        <div className="speed-actions-row">
          <div className="field">
            <span>Simulation speed</span>
            <div className="speed-segmented" role="radiogroup" aria-label="Simulation speed">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={speedMultiplier === option}
                  className={`speed-option ${speedMultiplier === option ? 'speed-option-active' : ''}`}
                  onClick={() => onSpeedChange(option)}
                >
                  {option}x
                </button>
              ))}
            </div>
          </div>

          <div className="controls-actions">
            <div className="button-row controls-button-row">
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
          </div>
        </div>
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
