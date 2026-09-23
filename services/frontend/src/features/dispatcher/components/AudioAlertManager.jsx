import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Checkbox } from "@/components/ui/checkbox";

export const AudioAlertManager = forwardRef(({ audibleAlerts, setAudibleAlerts }, ref) => {
  const audioContextRef = useRef(null);

  function enableAudibleAlerts(enabled) {
    if (enabled && !audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContextRef.current = new AudioContext();
    }
    audioContextRef.current?.resume();
    setAudibleAlerts(enabled);
  }

  useImperativeHandle(ref, () => ({
    playEscalationTone: () => {
      const context = audioContextRef.current;
      if (!context || context.state !== 'running') return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);
    }
  }));

  useEffect(() => () => {
    audioContextRef.current?.close();
  }, []);

  return (
    <div className="flex items-center gap-2 mb-4">
      <Checkbox
        id="audible"
        checked={audibleAlerts}
        onCheckedChange={(checked) => enableAudibleAlerts(checked)}
      />
      <label
        htmlFor="audible"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Play a brief tone for escalations
      </label>
    </div>
  );
});

AudioAlertManager.displayName = "AudioAlertManager";
