import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { useProfileStore } from '@/stores/profileStore';
import { updateProfileFields } from '@/services/profileService';
import {
  deleteMemo,
  getMemoUrl,
  requestMicrophonePermission,
  startMemoRecording,
  stopMemoRecording,
  uploadMemo,
} from '@/services/voiceMemoService';

const MAX_RECORD_SEC = 30;

interface VoiceMemoSettingsProps {
  userId: string;
  onDone: () => void;
}

type Phase = 'idle' | 'loading' | 'ready' | 'recording' | 'recorded' | 'none' | 'denied';

export function VoiceMemoSettings({ userId, onDone }: VoiceMemoSettingsProps) {
  const profile = useProfileStore((s) => s.profile);
  const patchProfile = useProfileStore((s) => s.patchProfile);
  const [phase, setPhase] = useState<Phase>('loading');
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowInWave, setAllowInWave] = useState(
    () => profile?.voice_memo_in_wave_enabled ?? false,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasMemo = Boolean(profile?.voice_memo_path);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasMemo) {
        setPhase('none');
        return;
      }
      const url = await getMemoUrl(userId);
      if (cancelled) return;
      if (!url) {
        setPhase('none');
        return;
      }
      setPlaybackUrl(url);
      setPhase('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [hasMemo, userId]);

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

  const handleListen = () => {
    if (!playbackUrl || !audioRef.current) return;
    void audioRef.current.play();
  };

  const handleStartRecord = async () => {
    setError(null);
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
    setPhase('recording');
  };

  const handleStop = async () => {
    clearTimer();
    const result = await stopMemoRecording();
    if (!result) {
      setPhase(hasMemo ? 'ready' : 'none');
      return;
    }
    setRecordedBlob(result.blob);
    setPlaybackUrl(URL.createObjectURL(result.blob));
    setPhase('recorded');
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) return;
    setBusy(true);
    setError(null);
    const path = await uploadMemo(recordedBlob, userId);
    if (!path) {
      setBusy(false);
      setError('Could not save — try again');
      return;
    }
    const recordedAt = new Date().toISOString();
    const updated = await updateProfileFields(userId, {
      voice_memo_path: path,
      voice_memo_in_wave_enabled: allowInWave,
      voice_memo_recorded_at: recordedAt,
    });
    setBusy(false);
    if (!updated) {
      setError('Saved file but profile update failed');
      return;
    }
    patchProfile({
      voice_memo_path: path,
      voice_memo_in_wave_enabled: allowInWave,
      voice_memo_recorded_at: recordedAt,
    });
    const url = await getMemoUrl(userId);
    setPlaybackUrl(url);
    setPhase('ready');
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    await deleteMemo(userId);
    const updated = await updateProfileFields(userId, {
      voice_memo_path: null,
      voice_memo_in_wave_enabled: false,
      voice_memo_recorded_at: null,
    });
    setBusy(false);
    if (!updated) {
      setError('Could not update profile');
      return;
    }
    patchProfile({
      voice_memo_path: null,
      voice_memo_in_wave_enabled: false,
      voice_memo_recorded_at: null,
    });
    setPlaybackUrl(null);
    setPhase('none');
  };

  return (
    <Page>
      <motion.div className="flex h-full min-h-0 flex-col py-4">
        <p className="text-label uppercase text-secondary">Account</p>
        <h2 className="mt-qum-sm text-h1 text-primary">Voice memo</h2>
        <p className="mt-qum-sm text-body text-secondary">
          The recording you made about why this matters. Future-you hears it during a wave.
        </p>

        {error && <p className="mt-qum-md text-body text-tertiary">{error}</p>}

        {phase === 'denied' && (
          <p className="mt-qum-md border border-secondary/30 bg-surface p-4 text-body text-secondary">
            Microphone access is off. Enable it in system settings, then try again.
          </p>
        )}

        {phase === 'loading' && (
          <p className="mt-qum-lg text-body text-secondary">Loading…</p>
        )}

        {(phase === 'ready' || phase === 'recorded') && playbackUrl && (
          <p className="mt-qum-md text-body text-secondary" id="settings-voice-memo-label">
            Your own recording — no captions are available.
          </p>
        )}

        {(phase === 'ready' || phase === 'none') && playbackUrl && (
          <audio
            ref={audioRef}
            src={playbackUrl}
            className="sr-only"
            aria-labelledby="settings-voice-memo-label"
          />
        )}

        {phase === 'recording' && (
          <p className="mt-qum-lg text-display tabular-nums text-primary">
            {elapsed}s / {MAX_RECORD_SEC}s
          </p>
        )}

        {phase === 'recorded' && playbackUrl && (
          <audio
            ref={audioRef}
            src={playbackUrl}
            className="sr-only"
            aria-labelledby="settings-voice-memo-label"
          />
        )}

        <div className="mt-auto flex flex-col gap-3 pt-qum-lg">
          {phase === 'ready' && (
            <>
              <button
                type="button"
                onClick={handleListen}
                aria-label="Listen to your voice memo"
                className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
              >
                Listen to your voice memo
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartRecord()}
                className="w-full border border-secondary/40 py-3 text-body text-primary disabled:opacity-40"
              >
                Re-record
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="w-full border border-tertiary/50 py-3 text-body text-tertiary disabled:opacity-40"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}

          {phase === 'none' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStartRecord()}
              className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
            >
              Record voice memo
            </button>
          )}

          {phase === 'recording' && (
            <button
              type="button"
              onClick={() => void handleStop()}
              className="w-full border-2 border-tertiary py-3 text-body font-semibold text-primary"
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
                  Let waves play this recording during Phase 2.
                </span>
              </label>
              <button
                type="button"
                onClick={() => audioRef.current?.play()}
                className="w-full border border-secondary/40 py-3 text-body text-primary"
              >
                Replay
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveRecording()}
                className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'Save recording'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onDone}
            className="py-2 text-label uppercase text-secondary"
          >
            Back
          </button>
        </div>
      </motion.div>
    </Page>
  );
}
