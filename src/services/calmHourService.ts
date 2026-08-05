import { supabase } from '@/lib/supabase';
import { getIsoWeekKey } from '@/lib/calm/calmHourWeek';
import { CALM_HOUR_DUE_MS } from '@/types/calmHour';
import type { CalmHourSession, CalmHourSessionInsert } from '@/types/calmHour';

const SESSION_COLUMNS =
  'id, user_id, completed_at, reviewed_letter, reviewed_voice_memo, reviewed_patterns, notes';

export async function fetchCalmHourSessions(userId: string): Promise<CalmHourSession[]> {
  const { data, error } = await supabase
    .from('calm_hour_sessions')
    .select(SESSION_COLUMNS)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(104);

  if (error) {
    console.error('fetchCalmHourSessions', error);
    return [];
  }

  return (data ?? []) as CalmHourSession[];
}

export async function insertCalmHourSession(
  userId: string,
  payload: CalmHourSessionInsert,
): Promise<CalmHourSession | null> {
  const { data, error } = await supabase
    .from('calm_hour_sessions')
    .insert({
      user_id: userId,
      reviewed_letter: payload.reviewed_letter,
      reviewed_voice_memo: payload.reviewed_voice_memo,
      reviewed_patterns: payload.reviewed_patterns,
      notes: payload.notes,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (error) {
    console.error('insertCalmHourSession', error);
    return null;
  }

  return data as CalmHourSession;
}

export function getLastCompletedAt(sessions: CalmHourSession[]): string | null {
  return sessions[0]?.completed_at ?? null;
}

export function isCalmHourDue(lastCompletedAt: string | null, now = Date.now()): boolean {
  if (!lastCompletedAt) return true;
  return now - new Date(lastCompletedAt).getTime() >= CALM_HOUR_DUE_MS;
}

/** Consecutive ISO weeks with a session, counting backward from the most recent check-in. */
export function computeCalmHourStreak(sessions: CalmHourSession[]): number {
  if (!sessions.length) return 0;

  const weeks = new Set(
    sessions.map((s) => getIsoWeekKey(new Date(s.completed_at))),
  );

  let streak = 1;
  const cursor = new Date(sessions[0].completed_at);

  for (let i = 0; i < 104; i += 1) {
    cursor.setDate(cursor.getDate() - 7);
    const key = getIsoWeekKey(cursor);
    if (weeks.has(key)) streak += 1;
    else break;
  }

  return streak;
}
