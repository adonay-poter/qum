export type TaskCategory = 'physical' | 'cognitive' | 'mindful' | 'cold';
export type MindfulModality =
  | 'grounding'
  | 'body_scan'
  | 'visualization'
  | 'breath'
  | 'noting'
  | 'observation';
export type ColdModality = 'face' | 'wrist' | 'neck' | 'full';
export type VerificationMethod = 'tap_count' | 'camera_upload' | 'text_input';
export type DifficultyTier = 'low' | 'medium' | 'high';

export type WaveMode =
  | 'IDLE'
  | 'PHASE_1_CHOICE'
  | 'PHASE_1'
  | 'PHASE_2_CHOICE'
  | 'PHASE_2'
  | 'PHASE_EXIT_CHECK'
  | 'PHASE_3'
  | 'VICTORY'
  | 'ABANDONED';

const WAVE_MODES: WaveMode[] = [
  'IDLE',
  'PHASE_1_CHOICE',
  'PHASE_1',
  'PHASE_2_CHOICE',
  'PHASE_2',
  'PHASE_EXIT_CHECK',
  'PHASE_3',
  'VICTORY',
  'ABANDONED',
];

/** Treat legacy / unknown persisted modes (e.g. COMMITMENT_CHECK) as IDLE. */
export function sanitizeWaveMode(mode: string | undefined | null): WaveMode {
  if (mode && (WAVE_MODES as string[]).includes(mode)) return mode as WaveMode;
  return 'IDLE';
}

export type WaveCompletionMode = 'full' | 'early_exit';

export {
  WAVE_DURATION_SEC,
  PHASE_1_END_SEC,
  PHASE_2_END_SEC,
  EARLY_EXIT_MIN_SEC,
  BREATHING_DURATION_SEC,
  BOX_CYCLES,
  BOX_PHASE_SEC,
} from '@/config/waveTiming';

export interface Profile {
  id: string;
  resilience_level: number;
  xp_points: number;
  total_waves_surfed: number;
  has_completed_onboarding: boolean;
  peak_danger_hour: number | null;
  physical_baseline: number | null;
  north_star: string | null;
  addiction_type: string | null;
  addiction_type_other: string | null;
  voice_memo_path: string | null;
  voice_memo_in_wave_enabled: boolean;
  voice_memo_recorded_at: string | null;
  last_wave_completed_at?: string | null;
}

export interface Task {
  id: string;
  category: TaskCategory;
  prompt_text: string;
  verification_method: VerificationMethod;
  tap_target: number | null;
  difficulty_tier: DifficultyTier;
  title?: string | null;
  description?: string | null;
  modality?: string | null;
  step_data?: { steps: { prompt: string; duration_sec: number }[] } | null;
  duration_sec?: number | null;
  safety_note?: string | null;
  requires_outdoor?: boolean;
  enabled?: boolean;
}

export interface WaveLog {
  id: string;
  user_id: string;
  started_at: string;
  completed: boolean;
  duration_survived: number;
  completion_mode?: WaveCompletionMode | null;
  urge_rating_at_exit?: number | null;
  audit_id?: string | null;
}

export interface UrgeHeatmapCell {
  hour: number;
  count: number;
}
