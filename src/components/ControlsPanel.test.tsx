import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { SpeedMultiplier } from '../domain/types';
import { ControlsPanel } from './ControlsPanel';

const Harness = (): JSX.Element => {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [simTimeMs, setSimTimeMs] = useState(0);
  const [rps, setRps] = useState(100);
  const [speedMultiplier, setSpeedMultiplier] = useState<SpeedMultiplier>(1);

  return (
    <ControlsPanel
      rps={rps}
      speedMultiplier={speedMultiplier}
      status={status}
      simTimeMs={simTimeMs}
      totalStarted={1000}
      onRpsChange={setRps}
      onSpeedChange={setSpeedMultiplier}
      onStart={() => {
        setStatus('running');
        setSimTimeMs(1000);
      }}
      onPause={() => setStatus('paused')}
      onReset={() => {
        setStatus('idle');
        setSimTimeMs(0);
      }}
    />
  );
};

describe('ControlsPanel', () => {
  it('updates state through start, pause, and reset actions', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText('IDLE')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    expect(screen.getByText('00:01')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('PAUSED')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('IDLE')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('switches speed from segmented controls', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const speed1x = screen.getByRole('radio', { name: '1x' });
    const speed10x = screen.getByRole('radio', { name: '10x' });
    const speed60x = screen.getByRole('radio', { name: '60x' });

    expect(speed1x).toHaveAttribute('aria-checked', 'true');
    expect(speed10x).toHaveAttribute('aria-checked', 'false');
    expect(speed60x).toHaveAttribute('aria-checked', 'false');

    await user.click(speed60x);
    expect(speed60x).toHaveAttribute('aria-checked', 'true');
    expect(speed1x).toHaveAttribute('aria-checked', 'false');
  });
});
