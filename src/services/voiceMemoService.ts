import { VoiceRecorder } from '@jlnkern/capacitor-voice-recorder';
import { supabase } from '@/lib/supabase';
import { isNativeApp } from '@/lib/platform/native';
import {
  cacheVoiceMemoBlob,
  getCachedVoiceMemoBlob,
  invalidateVoiceMemoCache,
} from '@/lib/storage/voiceMemoCache';

const VOICE_MEMO_BUCKET = 'voice-memos';
const REFLECTION_AUDIO_BUCKET = 'reflection-audio';
const MEMO_FILENAME = 'onboarding.m4a';

export function voiceMemoStoragePath(userId: string): string {
  return `${userId}/${MEMO_FILENAME}`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const can = await VoiceRecorder.canDeviceVoiceRecord();
    if (!can.value) return false;

    const has = await VoiceRecorder.hasAudioRecordingPermission();
    if (has.value) return true;

    const requested = await VoiceRecorder.requestAudioRecordingPermission();
    return requested.value;
  } catch (err) {
    console.warn('requestMicrophonePermission', err);
    if (!isNativeApp() && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function startMemoRecording(): Promise<boolean> {
  try {
    const result = await VoiceRecorder.startRecording();
    return result.value;
  } catch (err) {
    console.error('startMemoRecording', err);
    return false;
  }
}

export async function stopMemoRecording(): Promise<{
  blob: Blob;
  durationMs: number;
} | null> {
  try {
    const result = await VoiceRecorder.stopRecording();
    const b64 = result.value.recordDataBase64;
    if (!b64) return null;

    const mimeType = result.value.mimeType || 'audio/mp4';
    return {
      blob: base64ToBlob(b64, mimeType),
      durationMs: result.value.msDuration,
    };
  } catch (err) {
    console.error('stopMemoRecording', err);
    return null;
  }
}

export async function uploadMemo(blob: Blob, userId: string): Promise<string | null> {
  const path = voiceMemoStoragePath(userId);

  const { error } = await supabase.storage.from(VOICE_MEMO_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'audio/mp4',
  });

  if (error) {
    console.error('uploadMemo', error);
    return null;
  }

  await invalidateVoiceMemoCache(userId);
  return path;
}

export async function getMemoUrl(userId: string): Promise<string | null> {
  const path = voiceMemoStoragePath(userId);
  const { data, error } = await supabase.storage
    .from(VOICE_MEMO_BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    console.error('getMemoUrl', error);
    return null;
  }

  return data.signedUrl;
}

async function fetchMemoBlob(userId: string): Promise<Blob | null> {
  const signedUrl = await getMemoUrl(userId);
  if (!signedUrl) return null;

  try {
    const res = await fetch(signedUrl);
    if (!res.ok) return null;
    return await res.blob();
  } catch (err) {
    console.error('fetchMemoBlob', err);
    return null;
  }
}

/** Cached playback blob + object URL (1h TTL, IndexedDB). */
export async function getCachedMemoPlayback(
  userId: string,
): Promise<{ objectUrl: string; durationMs: number | null } | null> {
  const cached = await getCachedVoiceMemoBlob(userId);
  if (cached) {
    return {
      objectUrl: URL.createObjectURL(cached.blob),
      durationMs: cached.meta.durationMs,
    };
  }

  const blob = await fetchMemoBlob(userId);
  if (!blob) return null;

  const durationMs = await readAudioDurationMs(blob);
  await cacheVoiceMemoBlob(userId, blob, {
    mimeType: blob.type || 'audio/mp4',
    durationMs,
  });

  return {
    objectUrl: URL.createObjectURL(blob),
    durationMs,
  };
}

function readAudioDurationMs(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
    };
    audio.addEventListener('loadedmetadata', () => {
      const ms = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null;
      cleanup();
      resolve(ms);
    });
    audio.addEventListener('error', () => {
      cleanup();
      resolve(null);
    });
  });
}

export async function deleteMemo(userId: string): Promise<boolean> {
  const path = voiceMemoStoragePath(userId);
  const { error } = await supabase.storage.from(VOICE_MEMO_BUCKET).remove([path]);

  if (error) {
    console.error('deleteMemo', error);
    return false;
  }

  await invalidateVoiceMemoCache(userId);
  return true;
}

export function reflectionAudioStoragePath(
  userId: string,
  sessionId: string,
  field: 'trigger' | 'location' | 'loophole',
): string {
  return `${userId}/${sessionId}/${field}.m4a`;
}

export async function uploadReflectionAudio(
  blob: Blob,
  userId: string,
  sessionId: string,
  field: 'trigger' | 'location' | 'loophole',
): Promise<string | null> {
  const path = reflectionAudioStoragePath(userId, sessionId, field);
  const { error } = await supabase.storage.from(REFLECTION_AUDIO_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'audio/mp4',
  });
  if (error) {
    console.error('uploadReflectionAudio', error);
    return null;
  }
  return path;
}

/** Record, stop, upload, and return storage path. */
export async function recordAndUploadMemo(
  userId: string,
): Promise<{ path: string; durationMs: number } | null> {
  const stopped = await stopMemoRecording();
  if (!stopped) return null;

  const path = await uploadMemo(stopped.blob, userId);
  if (!path) return null;

  return { path, durationMs: stopped.durationMs };
}
