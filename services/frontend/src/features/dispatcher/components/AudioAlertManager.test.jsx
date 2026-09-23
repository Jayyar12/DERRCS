import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioAlertManager } from './AudioAlertManager';

const createOscillator = vi.fn(() => ({
  frequency: { value: 0 },
  connect: vi.fn((gain) => gain),
  start: vi.fn(),
  stop: vi.fn(),
}));

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createOscillator = createOscillator;
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('AudioAlertManager', () => {
  it('does not play an escalation after audible alerts are turned off', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const manager = createRef();

    function Harness() {
      const [enabled, setEnabled] = useState(false);
      return <AudioAlertManager ref={manager} audibleAlerts={enabled} setAudibleAlerts={setEnabled} />;
    }

    render(<Harness />);
    manager.current.playEscalationTone();
    expect(createOscillator).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
    manager.current.playEscalationTone();
    expect(createOscillator).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked());
    manager.current.playEscalationTone();
    expect(createOscillator).toHaveBeenCalledTimes(1);
  });
});
