export type ReflectionMode = 'post_wave' | 'manual_log' | 'delayed_prompt';

export type ReflectionWhenPreset =
  | 'within_last_hour'
  | 'earlier_today'
  | 'yesterday'
  | 'earlier_this_week'
  | 'other';

export type ReflectionTrigger =
  | 'boredom'
  | 'stress'
  | 'loneliness'
  | 'fatigue'
  | 'anger'
  | 'celebration'
  | 'other';

export type ReflectionLocation =
  | 'bed'
  | 'desk'
  | 'bathroom'
  | 'couch'
  | 'kitchen'
  | 'commute'
  | 'outdoors'
  | 'other';

/** @deprecated Use Reflection* types */
export type CrashEndedIn = 'abandoned' | 'rage_quit' | 'manual_log';
export type CrashWhenPreset = ReflectionWhenPreset;
export type CrashTrigger = ReflectionTrigger;
export type CrashLocation = ReflectionLocation;

export interface Reflection {
  id: string;
  user_id: string;
  wave_id: string | null;
  mode: ReflectionMode;
  ended_in: string | null;
  trigger: ReflectionTrigger | null;
  trigger_other: string | null;
  trigger_audio_path: string | null;
  location: ReflectionLocation | null;
  location_other: string | null;
  location_audio_path: string | null;
  loophole: string | null;
  loophole_audio_path: string | null;
  occurred_at: string;
  created_at: string;
  client_created_at: string;
  synced: boolean;
}

export type CrashReport = Reflection;

export interface ReflectionPayload {
  trigger?: ReflectionTrigger | null;
  trigger_other?: string | null;
  trigger_audio_path?: string | null;
  location?: ReflectionLocation | null;
  location_other?: string | null;
  location_audio_path?: string | null;
  loophole?: string | null;
  loophole_audio_path?: string | null;
  occurred_at?: string;
}

export type CrashReportPayload = ReflectionPayload;

export const REFLECTION_WHEN_PRESETS: { id: ReflectionWhenPreset; label: string }[] = [
  { id: 'within_last_hour', label: 'Within the last hour' },
  { id: 'earlier_today', label: 'Earlier today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'earlier_this_week', label: 'Earlier this week' },
  { id: 'other', label: 'Other' },
];

export const CRASH_WHEN_PRESETS = REFLECTION_WHEN_PRESETS;

export function resolveOccurredAt(
  preset: ReflectionWhenPreset,
  customIso?: string,
): string {
  const now = new Date();
  switch (preset) {
    case 'within_last_hour':
      return new Date(now.getTime() - 45 * 60 * 1000).toISOString();
    case 'earlier_today': {
      const d = new Date(now);
      const hour = Math.max(8, now.getHours() - 3);
      d.setHours(hour, 0, 0, 0);
      if (d.getTime() > now.getTime()) {
        d.setTime(now.getTime() - 2 * 60 * 60 * 1000);
      }
      return d.toISOString();
    }
    case 'yesterday': {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      d.setMinutes(0, 0, 0);
      return d.toISOString();
    }
    case 'earlier_this_week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 3);
      d.setHours(now.getHours(), 0, 0, 0);
      return d.toISOString();
    }
    case 'other':
      return customIso ?? now.toISOString();
  }
}

export const REFLECTION_TRIGGERS: { id: ReflectionTrigger; label: string }[] = [
  { id: 'boredom', label: 'Boredom' },
  { id: 'stress', label: 'Stress' },
  { id: 'loneliness', label: 'Loneliness' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'anger', label: 'Anger' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'other', label: 'Other' },
];

export const CRASH_TRIGGERS = REFLECTION_TRIGGERS;

export const REFLECTION_LOCATIONS: { id: ReflectionLocation; label: string }[] = [
  { id: 'bed', label: 'Bed' },
  { id: 'desk', label: 'Desk' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'couch', label: 'Couch' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'commute', label: 'Commute' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'other', label: 'Other' },
];

export const CRASH_LOCATIONS = REFLECTION_LOCATIONS;

export interface ReflectionOpenContext {
  waveId: string | null;
  mode: ReflectionMode;
}
