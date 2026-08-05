import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/network/connectivity';
import {
  computeResilience,
  type ResilienceEvent,
} from '@/lib/resilience/resilienceModel';

export async function recomputeResilienceRemote(userId: string): Promise<number | null> {
  if (!isOnline()) return null;

  const { data, error } = await supabase.rpc('recompute_resilience', {
    p_user_id: userId,
  });

  if (error) {
    console.error('recompute_resilience', error);
    return null;
  }

  return typeof data === 'number' ? data : null;
}

export function computeResilienceLocal(
  events: ResilienceEvent[],
  previousLevel: number,
): number {
  return computeResilience(events, new Date(), previousLevel);
}
