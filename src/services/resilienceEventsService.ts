import { supabase } from '@/lib/supabase';
import type { ResilienceEvent } from '@/lib/resilience/resilienceModel';

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

/** Fetch all events used for the rolling resilience window (client-side recompute). */
export async function fetchResilienceEvents(userId: string): Promise<ResilienceEvent[]> {
  const [waves, reflections, calmHours, commitments] = await Promise.all([
    supabase
      .from('waves_log')
      .select('started_at, completed')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(500),
    supabase
      .from('reflections')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('calm_hour_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(104),
    supabase
      .from('commitments')
      .select('broken_at, honored')
      .eq('user_id', userId)
      .not('broken_at', 'is', null),
  ]);

  const events: ResilienceEvent[] = [];

  for (const row of waves.data ?? []) {
    events.push({
      type: row.completed ? 'wave_completed' : 'wave_failed',
      at: toMs(row.started_at),
    });
  }

  for (const row of reflections.data ?? []) {
    events.push({ type: 'reflection_submitted', at: toMs(row.created_at) });
  }

  for (const row of calmHours.data ?? []) {
    events.push({ type: 'calm_hour_completed', at: toMs(row.completed_at) });
  }

  for (const row of commitments.data ?? []) {
    if (row.honored === false && row.broken_at) {
      events.push({ type: 'commitment_broken', at: toMs(row.broken_at) });
    }
  }

  return events;
}
