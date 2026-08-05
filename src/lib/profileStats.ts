import type { Profile } from '@/types/database';

export const RESILIENCE_MIN = 0;
export const RESILIENCE_MAX = 100;

export function clampResilience(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(RESILIENCE_MAX, Math.max(RESILIENCE_MIN, Math.round(value)));
}

export function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    resilience_level: clampResilience(profile.resilience_level ?? 50),
    xp_points: Math.max(0, profile.xp_points ?? 0),
    total_waves_surfed: Math.max(0, profile.total_waves_surfed ?? 0),
    has_completed_onboarding: profile.has_completed_onboarding ?? false,
    peak_danger_hour:
      profile.peak_danger_hour != null
        ? Math.min(23, Math.max(0, Math.round(profile.peak_danger_hour)))
        : null,
    physical_baseline:
      profile.physical_baseline != null
        ? Math.max(1, Math.round(profile.physical_baseline))
        : null,
    north_star: profile.north_star ?? null,
    addiction_type: profile.addiction_type ?? null,
    addiction_type_other: profile.addiction_type_other ?? null,
    voice_memo_path: profile.voice_memo_path ?? null,
    voice_memo_in_wave_enabled: profile.voice_memo_in_wave_enabled ?? false,
    voice_memo_recorded_at: profile.voice_memo_recorded_at ?? null,
  };
}
