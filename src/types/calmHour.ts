export interface CalmHourSession {
  id: string;
  user_id: string;
  completed_at: string;
  reviewed_letter: boolean;
  reviewed_voice_memo: boolean;
  reviewed_patterns: boolean;
  notes: string | null;
}

export interface CalmHourSessionInsert {
  reviewed_letter: boolean;
  reviewed_voice_memo: boolean;
  reviewed_patterns: boolean;
  notes: string | null;
}

/** Sunday = 0 (JS Date.getDay). */
export const DEFAULT_CALM_HOUR_WEEKDAY = 0;
export const DEFAULT_CALM_HOUR = 10;
export const CALM_HOUR_DUE_MS = 7 * 24 * 60 * 60 * 1000;
