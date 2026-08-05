import { supabase } from '@/lib/supabase';
import { normalizeProfile } from '@/lib/profileStats';
import type { Profile } from '@/types/database';
import type { OnboardingData } from '@/types/onboarding';

const PROFILE_COLUMNS =
  'id, resilience_level, xp_points, total_waves_surfed, has_completed_onboarding, peak_danger_hour, physical_baseline, north_star, addiction_type, addiction_type_other, voice_memo_path, voice_memo_in_wave_enabled, voice_memo_recorded_at, last_wave_completed_at';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchProfile', error);
    return null;
  }

  return data ? normalizeProfile(data as Profile) : null;
}

export async function ensureProfile(userId: string): Promise<Profile | null> {
  let profile = await fetchProfile(userId);
  if (profile) return profile;

  const { error } = await supabase.from('profiles').insert({ id: userId });
  if (error && error.code !== '23505') {
    console.error('ensureProfile insert', error);
    return null;
  }

  return fetchProfile(userId);
}

export async function persistOnboarding(
  userId: string,
  payload: OnboardingData,
): Promise<{ profile: Profile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      addiction_type: payload.addiction_type,
      addiction_type_other: payload.addiction_type_other,
      peak_danger_hour: payload.peak_danger_hour,
      physical_baseline: payload.physical_baseline,
      north_star: payload.north_star,
      voice_memo_path: payload.voice_memo_path,
      voice_memo_in_wave_enabled: payload.voice_memo_in_wave_enabled,
      voice_memo_recorded_at: payload.voice_memo_path
        ? new Date().toISOString()
        : null,
      has_completed_onboarding: true,
    })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error('persistOnboarding', error);
    return { profile: null, error };
  }

  return { profile: normalizeProfile(data as Profile), error: null };
}

export async function updateProfileFields(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | 'voice_memo_path'
      | 'voice_memo_in_wave_enabled'
      | 'voice_memo_recorded_at'
      | 'addiction_type'
      | 'addiction_type_other'
      | 'peak_danger_hour'
    >
  >,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error('updateProfileFields', error);
    return null;
  }

  return normalizeProfile(data as Profile);
}
