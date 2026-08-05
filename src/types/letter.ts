export interface Letter {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const LETTER_SUGGESTED_MIN_CHARS = 200;
export const LETTER_SUGGESTED_MAX_CHARS = 500;
