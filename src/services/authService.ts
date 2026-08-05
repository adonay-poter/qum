import { supabase } from '@/lib/supabase';
import { remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { useProfileStore } from '@/stores/profileStore';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { useWaveStore } from '@/stores/waveStore';

/** Wipes session, Zustand memory, and user-scoped local caches. */
export async function secureSignOut(): Promise<void> {
  await supabase.auth.signOut();

  useWaveStore.getState().resetToIdle();
  useProfileStore.getState().clear();
  useCommitmentStore.getState().clear();

  remove(STORAGE_KEYS.PROFILE_CACHE);
  remove(STORAGE_KEYS.COMMITMENTS_CACHE);
  remove(STORAGE_KEYS.CRASH_REPORTS_OUTBOX);
  remove(STORAGE_KEYS.SYNC_QUEUE);
  remove(STORAGE_KEYS.ACTIVE_SESSION_LOCK);
  remove(STORAGE_KEYS.PENDING_RAGE_QUIT);
  remove(STORAGE_KEYS.NOTIFICATION_SCHEDULE);
}
