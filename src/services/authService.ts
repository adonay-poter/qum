import { supabase } from '@/lib/supabase';
import { remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { useProfileStore } from '@/stores/profileStore';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { useWaveStore } from '@/stores/waveStore';

export interface TelegramUserPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Authenticates with Telegram widget payload via Supabase Edge Function */
export async function signInWithTelegramPayload(payload: TelegramUserPayload) {
  const { data, error } = await supabase.functions.invoke<{
    session: { access_token: string; refresh_token: string };
    user: unknown;
  }>('telegram-auth', {
    body: payload,
  });

  if (error) {
    return { session: null, error: error instanceof Error ? error : new Error(error.message || 'Telegram authentication failed') };
  }

  if (!data?.session?.access_token || !data?.session?.refresh_token) {
    return { session: null, error: new Error('Invalid session response from Telegram auth service') };
  }

  const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  if (setSessionError) {
    return { session: null, error: setSessionError };
  }

  return { session: sessionData.session, error: null };
}

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

