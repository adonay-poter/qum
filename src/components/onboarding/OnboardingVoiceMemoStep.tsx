import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  requestMicrophonePermission,
  startMemoRecording,
  stopMemoRecording,
  uploadMemo,
} from '@/services/voiceMemoService';
import { trackEvent } from '@/services/telemetryService';

const MAX_RECORD_SEC = 30;

interface OnboardingVoiceMemoStepProps {
  userId: string;
  onSaved: (path: string, inWaveEnabled: boolean) => void;
  onSkip: () => void;
  onBack: () => void;
}

type Phase = 'idle' | 'recording' | 'recorded' | 'denied';

export function OnboardingVoiceMemoStep({
  userId,
  onSaved,
  onSkip,
  onBack,
}: OnboardingVoiceMemoStepProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationMs, setRecordedDurationMs] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allowInWave, setAllowInWave] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (phase !== 'recording') return;

    timerRef.current = setInterval(() => {
      setElapsed((n) => {
        if (n + 1 >= MAX_RECORD_SEC) {
          void handleStop();
          return MAX_RECORD_SEC;
        }
        return n + 1;
      });
    }, 1000);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleStart = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) {
      setPhase('denied');
      return;
    }

    const started = await startMemoRecording();
    if (!started) {
      setPhase('denied');
      return;
    }

    setElapsed(0);
    setRecordedBlob(null);
    setPlaybackUrl(null);
    setPhase('recording');
  };

  const handleStop = async () => {
    clearTimer();
    if (phase !== 'recording') return;

    const result = await stopMemoRecording();
    if (!result) {
      setPhase('idle');
      return;
    }

    setRecordedBlob(result.blob);
    setRecordedDurationMs(result.durationMs);
    setPlaybackUrl(URL.createObjectURL(result.blob));
    setPhase('recorded');
  };

  const handleReplay = () => {
    if (!playbackUrl || !audioRef.current) return;
    void audioRef.current.play();
  };

  const handleSave = async () => {
    if (!recordedBlob) return;
    setBusy(true);
    const path = await uploadMemo(recordedBlob, userId);
    setBusy(false);
    if (!path) return;

    trackEvent('voice_memo_recorded', {
      duration_ms: recordedDurationMs,
    });
    onSaved(path, allowInWave);
  };

  const handleSkip = () => {
    trackEvent('voice_memo_skipped');
    onSkip();
  };

  return (
    <section className="flex flex-1 flex-col">
      <h2 className="text-h1 text-primary">
        Record 30 seconds: why does this matter to you?
      </h2>
      <p className="mt-qum-sm text-body text-secondary">
        Future-you will hear this during a wave. Speak like you mean it.
      </p>

      {phase === 'denied' && (
        <p className="mt-qum-md border border-secondary/30 bg-surface p-4 text-body text-secondary">
          No worries — you can record this later from settings under Account → Voice memo.
        </p>
      )}

      <div className="mt-qum-lg flex flex-1 flex-col items-center justify-center">
        {phase === 'recording' && (
          <div className="flex h-24 items-end justify-center gap-1" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <motion.span
                key={i}
                className="w-2 bg-tertiary"
                animate={{ height: ['20%', '90%', '30%'] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        )}

        {phase === 'recorded' && playbackUrl && (
          <audio ref={audioRef} src={playbackUrl} className="sr-only" />
        )}

        <p className="mt-qum-md text-display tabular-nums text-primary">
          {phase === 'recording'
            ? `${elapsed}s / ${MAX_RECORD_SEC}s`
            : phase === 'recorded'
              ? `${Math.round(recordedDurationMs / 1000)}s recorded`
              : '—'}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-qum-lg">
        {phase === 'idle' && (
          <button
            type="button"
            onClick={() => void handleStart()}
            className="w-full bg-tertiary py-4 text-body font-semibold text-on-primary"
          >
            Start recording
          </button>
        )}

        {phase === 'recording' && (
          <button
            type="button"
            onClick={() => void handleStop()}
            className="w-full border-2 border-tertiary py-4 text-body font-semibold text-primary"
          >
            Stop
          </button>
        )}

        {phase === 'recorded' && (
          <>
            <label className="flex items-start gap-3 border border-secondary/30 bg-surface p-4 text-left">
              <input
                type="checkbox"
                checked={allowInWave}
                onChange={(e) => setAllowInWave(e.target.checked)}
                className="mt-1"
              />
              <span className="text-body text-primary">
                Let waves play this recording during Phase 2 (you can change this later in
                settings).
              </span>
            </label>
            <button
              type="button"
              onClick={handleReplay}
              className="w-full border border-secondary/40 py-3 text-body text-primary"
            >
              Replay
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleSkip}
          className="w-full border border-secondary/30 py-3 text-body text-secondary"
        >
          Skip
        </button>
        <button type="button" onClick={onBack} className="py-2 text-label uppercase text-secondary">
          Back
        </button>
      </div>
    </section>
  );
}
