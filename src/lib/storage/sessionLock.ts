import { WAVE_DURATION_SEC, sanitizeWaveMode } from '@/types/database';
import type { ActiveSessionLock } from '@/types/session';
import type { WaveMode } from '@/types/database';
import { readJson, remove, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export function writeSessionLock(lock: ActiveSessionLock): void {
  writeJson(STORAGE_KEYS.ACTIVE_SESSION_LOCK, lock);
}

export function readSessionLock(): ActiveSessionLock | null {
  const lock = readJson<ActiveSessionLock>(STORAGE_KEYS.ACTIVE_SESSION_LOCK);
  if (!lock) return null;
  const currentPhase = sanitizeWaveMode(lock.currentPhase);
  if (currentPhase !== lock.currentPhase) {
    return { ...lock, currentPhase };
  }
  return lock;
}

export function clearSessionLock(): void {
  remove(STORAGE_KEYS.ACTIVE_SESSION_LOCK);
}

export function updateSessionLockPhase(phase: WaveMode, elapsedSec: number): void {
  const lock = readSessionLock();
  if (!lock) return;
  writeSessionLock({ ...lock, currentPhase: phase, elapsedSec });
}

export function createSessionLock(params: {
  userId: string;
  waveId: string | null;
  localWaveId: string;
  originalResilience: number;
  startTime?: number;
  hadActiveCommitmentAtStart?: boolean;
}): ActiveSessionLock {
  const startTime = params.startTime ?? Date.now();
  return {
    startTime,
    targetEndTime: startTime + WAVE_DURATION_SEC * 1000,
    currentPhase: 'PHASE_1_CHOICE',
    originalResilience: params.originalResilience,
    waveId: params.waveId,
    localWaveId: params.localWaveId,
    userId: params.userId,
    elapsedSec: 0,
    hadActiveCommitmentAtStart: params.hadActiveCommitmentAtStart ?? false,
  };
}
