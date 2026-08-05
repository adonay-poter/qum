import { isOnline } from '@/lib/network/connectivity';
import { clearSessionLock } from '@/lib/storage/sessionLock';
import { enqueue, flushSyncQueue, mapLocalWaveToServer } from '@/services/syncQueueService';
import { scheduleReflectionPrompt } from '@/services/reflectionScheduler';
import { completeWave, failWave, startWave } from '@/services/waveService';
import type { WaveCompletionMode, WaveLog } from '@/types/database';

export interface CompleteWaveOptions {
  completionMode?: WaveCompletionMode;
  urgeRatingAtExit?: number | null;
}

export interface WaveStartResult {
  waveId: string | null;
  localWaveId: string;
  startedAt: string;
}

export async function startWaveOfflineAware(userId: string): Promise<WaveStartResult> {
  const localWaveId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  if (isOnline()) {
    const wave = await startWave(userId);
    if (wave) {
      mapLocalWaveToServer(localWaveId, wave.id);
      return { waveId: wave.id, localWaveId, startedAt: wave.started_at };
    }
  }

  enqueue({ type: 'wave_start', userId, localWaveId, startedAt });
  return { waveId: null, localWaveId, startedAt };
}

export async function completeWaveOfflineAware(
  waveId: string | null,
  localWaveId: string,
  durationSurvived: number,
  options?: CompleteWaveOptions,
): Promise<boolean> {
  clearSessionLock();

  const completionMode = options?.completionMode ?? 'full';
  const urgeRatingAtExit = options?.urgeRatingAtExit ?? null;

  if (isOnline() && waveId) {
    const ok = await completeWave(waveId, durationSurvived, {
      completionMode,
      urgeRatingAtExit,
    });
    if (ok) return true;
  }

  enqueue({
    type: 'wave_complete',
    waveId,
    localWaveId,
    durationSurvived,
    completionMode,
    urgeRatingAtExit,
  });
  void flushSyncQueue();
  return true;
}

export async function failWaveOfflineAware(
  waveId: string | null,
  localWaveId: string,
  durationSurvived: number,
  reason: 'abandon' | 'rage_quit' = 'abandon',
): Promise<boolean> {
  clearSessionLock();

  if (isOnline() && waveId) {
    const ok = await failWave(waveId, durationSurvived);
    if (ok) return true;
  }

  enqueue({ type: 'wave_fail', waveId, localWaveId, durationSurvived, reason });
  void flushSyncQueue();
  void scheduleReflectionPrompt({ waveId, failedAt: Date.now() });
  return true;
}

export function buildOfflineWaveLog(
  userId: string,
  localWaveId: string,
  startedAt: string,
): WaveLog {
  return {
    id: localWaveId,
    user_id: userId,
    started_at: startedAt,
    completed: false,
    duration_survived: 0,
  };
}
