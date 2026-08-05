import { useState } from 'react';
import {
  requestMicrophonePermission,
  startMemoRecording,
  stopMemoRecording,
  uploadReflectionAudio,
} from '@/services/voiceMemoService';

interface VoiceFieldRecorderProps {
  userId: string;
  sessionId: string;
  field: 'trigger' | 'location' | 'loophole';
  onRecorded: (path: string) => void;
  disabled?: boolean;
}

export function VoiceFieldRecorder({
  userId,
  sessionId,
  field,
  onRecorded,
  disabled,
}: VoiceFieldRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleStart = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) return;
    const started = await startMemoRecording();
    if (started) setRecording(true);
  };

  const handleStop = async () => {
    setRecording(false);
    setBusy(true);
    const stopped = await stopMemoRecording();
    if (!stopped) {
      setBusy(false);
      return;
    }
    const path = await uploadReflectionAudio(stopped.blob, userId, sessionId, field);
    setBusy(false);
    if (path) {
      setSaved(true);
      onRecorded(path);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {!recording && !saved && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void handleStart()}
          className="border border-secondary/40 px-3 py-2 text-[0.68rem] uppercase tracking-wider text-secondary"
        >
          Record voice note
        </button>
      )}
      {recording && (
        <button
          type="button"
          onClick={() => void handleStop()}
          className="border border-tertiary px-3 py-2 text-[0.68rem] uppercase tracking-wider text-primary"
        >
          Stop recording
        </button>
      )}
      {busy && <span className="text-body text-secondary">Saving…</span>}
      {saved && <span className="text-body text-tertiary">Voice note saved</span>}
    </div>
  );
}
