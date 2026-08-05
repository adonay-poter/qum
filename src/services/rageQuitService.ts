import { clearSessionLock, readSessionLock } from '@/lib/storage/sessionLock';
import { trackEvent } from '@/services/telemetryService';
import { useWaveStore } from '@/stores/waveStore';
import { readJson, writeJson, remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { isOnline } from '@/lib/network/connectivity';
import { scheduleReflectionPrompt } from '@/services/reflectionScheduler';
import { failWave } from '@/services/waveService';
import { enqueue, flushSyncQueue } from '@/services/syncQueueService';
import { useProfileStore } from '@/stores/profileStore';
import type { ActiveSessionLock } from '@/types/session';

export type RageQuitResolution = 'none' | 'rage_quit' | 'expired_clean';

export async function evaluateSessionLockOnBoot(): Promise<{
  resolution: RageQuitResolution;
  lock: ActiveSessionLock | null;
}> {
  const lock = readSessionLock();
  if (!lock) return { resolution: 'none', lock: null };

  if (useWaveStore.getState().isLocked) {
    return { resolution: 'none', lock };
  }

  const now = Date.now();

  if (now >= lock.targetEndTime) {
    clearSessionLock();
    return { resolution: 'expired_clean', lock };
  }

  await recordRageQuitFailure(lock);
  return { resolution: 'rage_quit', lock };
}

async function recordRageQuitFailure(lock: ActiveSessionLock): Promise<void> {
  const durationSurvived = Math.floor((Date.now() - lock.startTime) / 1000);
  const hadActiveCommitment =
    lock.hadActiveCommitmentAtStart ??
    useWaveStore.getState().hadActiveCommitmentAtStart;

  trackEvent('wave_failed', {
    had_active_commitment: hadActiveCommitment,
    reason: 'rage_quit',
  });

  if (isOnline() && lock.waveId) {
    await failWave(lock.waveId, durationSurvived);
  } else {
    enqueue({
      type: 'wave_fail',
      waveId: lock.waveId,
      localWaveId: lock.localWaveId,
      durationSurvived,
      reason: 'rage_quit',
    });
    void flushSyncQueue();
  }

  writeJson(STORAGE_KEYS.PENDING_RAGE_QUIT, { at: Date.now() });

  void scheduleReflectionPrompt({
    waveId: lock.waveId,
    failedAt: Date.now(),
  });

  clearSessionLock();

  void useProfileStore.getState().recomputeResilience(lock.userId);
}

export function consumeRageQuitNotice(): boolean {
  const notice = readJson<{ at: number }>(STORAGE_KEYS.PENDING_RAGE_QUIT);
  if (!notice) return false;
  remove(STORAGE_KEYS.PENDING_RAGE_QUIT);
  return true;
}
