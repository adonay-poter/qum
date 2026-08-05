import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/network/connectivity';
import { useProfileStore } from '@/stores/profileStore';
import {
  enqueueReflection,
  readReflectionsOutbox,
  removeReflectionOutboxItem,
  type ReflectionOutboxItem,
} from '@/lib/storage/reflectionsOutbox';
import type { Reflection, ReflectionMode, ReflectionPayload } from '@/types/reflection';

const REFLECTION_COLUMNS =
  'id, user_id, wave_id, mode, ended_in, trigger, trigger_other, trigger_audio_path, location, location_other, location_audio_path, loophole, loophole_audio_path, occurred_at, created_at, client_created_at, synced';

export async function insertReflection(
  userId: string,
  waveId: string | null,
  mode: ReflectionMode,
  payload: ReflectionPayload,
): Promise<{ reflectionId: string; synced: boolean }> {
  const clientCreatedAt = new Date().toISOString();
  const occurredAt = payload.occurred_at ?? clientCreatedAt;
  const localId = crypto.randomUUID();

  const row = {
    id: localId,
    user_id: userId,
    wave_id: waveId,
    mode,
    ended_in: mode === 'manual_log' ? 'manual_log' : null,
    trigger: payload.trigger ?? null,
    trigger_other: payload.trigger_other ?? null,
    trigger_audio_path: payload.trigger_audio_path ?? null,
    location: payload.location ?? null,
    location_other: payload.location_other ?? null,
    location_audio_path: payload.location_audio_path ?? null,
    loophole: payload.loophole?.trim() || null,
    loophole_audio_path: payload.loophole_audio_path ?? null,
    occurred_at: occurredAt,
    client_created_at: clientCreatedAt,
    synced: true,
  };

  if (isOnline()) {
    const { data, error } = await supabase
      .from('reflections')
      .insert(row)
      .select('id')
      .single();

    if (!error && data) {
      if (waveId) {
        await supabase.from('waves_log').update({ audit_id: data.id }).eq('id', waveId);
      }
      void useProfileStore.getState().recomputeResilience(userId);
      return { reflectionId: data.id as string, synced: true };
    }
  }

  enqueueReflection({ userId, waveId, mode, payload, clientCreatedAt }, localId);

  if (waveId) {
    void linkWaveReflectionOffline(waveId, localId);
  }

  return { reflectionId: localId, synced: false };
}

async function linkWaveReflectionOffline(waveId: string, reflectionId: string): Promise<void> {
  if (!isOnline()) return;
  await supabase.from('waves_log').update({ audit_id: reflectionId }).eq('id', waveId);
}

export async function flushReflectionsOutbox(): Promise<void> {
  if (!isOnline()) return;

  for (const item of readReflectionsOutbox()) {
    const ok = await syncOutboxItem(item);
    if (ok) removeReflectionOutboxItem(item.id);
  }
}

async function syncOutboxItem(item: ReflectionOutboxItem): Promise<boolean> {
  const occurredAt = item.payload.occurred_at ?? item.clientCreatedAt;
  const { data, error } = await supabase
    .from('reflections')
    .insert({
      id: item.id,
      user_id: item.userId,
      wave_id: item.waveId,
      mode: item.mode,
      ended_in: item.mode === 'manual_log' ? 'manual_log' : null,
      trigger: item.payload.trigger ?? null,
      trigger_other: item.payload.trigger_other ?? null,
      trigger_audio_path: item.payload.trigger_audio_path ?? null,
      location: item.payload.location ?? null,
      location_other: item.payload.location_other ?? null,
      location_audio_path: item.payload.location_audio_path ?? null,
      loophole: item.payload.loophole?.trim() || null,
      loophole_audio_path: item.payload.loophole_audio_path ?? null,
      occurred_at: occurredAt,
      client_created_at: item.clientCreatedAt,
      synced: true,
    })
    .select('id')
    .single();

  if (error || !data) return false;

  if (item.waveId) {
    await supabase.from('waves_log').update({ audit_id: data.id }).eq('id', item.waveId);
  }

  return true;
}

export async function fetchReflections(
  userId: string,
  sinceIso: string,
): Promise<Reflection[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select(REFLECTION_COLUMNS)
    .eq('user_id', userId)
    .gte('occurred_at', sinceIso)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('fetchReflections', error);
    return [];
  }

  return (data ?? []) as Reflection[];
}

/** @deprecated */
export const insertCrashReport = (
  userId: string,
  waveId: string | null,
  endedIn: 'abandoned' | 'rage_quit' | 'manual_log',
  payload: ReflectionPayload,
) => {
  const mode: ReflectionMode =
    endedIn === 'manual_log' ? 'manual_log' : 'post_wave';
  return insertReflection(userId, waveId, mode, payload);
};

export const fetchCrashReports = fetchReflections;
export const flushCrashReportsOutbox = flushReflectionsOutbox;
