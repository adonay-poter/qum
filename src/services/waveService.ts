import { supabase } from '@/lib/supabase';
import type { WaveCompletionMode, WaveLog } from '@/types/database';

export interface CompleteWaveRpcOptions {
  completionMode?: WaveCompletionMode;
  urgeRatingAtExit?: number | null;
}

export async function startWave(userId: string): Promise<WaveLog | null> {
  const { data, error } = await supabase
    .from('waves_log')
    .insert({ user_id: userId })
    .select('id, user_id, started_at, completed, duration_survived, audit_id')
    .single();

  if (error) {
    console.error('startWave', error);
    return null;
  }

  return data as WaveLog;
}

export async function completeWave(
  waveId: string,
  durationSurvived: number,
  options?: CompleteWaveRpcOptions,
): Promise<boolean> {
  const { error } = await supabase.rpc('complete_wave', {
    p_wave_id: waveId,
    p_duration_survived: durationSurvived,
    p_completion_mode: options?.completionMode ?? 'full',
    p_urge_rating_at_exit: options?.urgeRatingAtExit ?? null,
  });

  if (error) {
    console.error('completeWave', error);
    return false;
  }

  return true;
}

export async function failWave(waveId: string, durationSurvived: number): Promise<boolean> {
  const { error } = await supabase.rpc('fail_wave', {
    p_wave_id: waveId,
    p_duration_survived: durationSurvived,
  });

  if (error) {
    console.error('failWave', error);
    return false;
  }

  return true;
}

export async function fetchRecentWaves(userId: string, days = 7): Promise<WaveLog[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('waves_log')
    .select('id, user_id, started_at, completed, duration_survived, audit_id')
    .eq('user_id', userId)
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(40);

  if (error) {
    console.error('fetchRecentWaves', error);
    return [];
  }

  return (data ?? []) as WaveLog[];
}

export async function fetchWavesLog(userId: string): Promise<WaveLog[]> {
  const { data, error } = await supabase
    .from('waves_log')
    .select('id, user_id, started_at, completed, duration_survived, audit_id')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('fetchWavesLog', error);
    return [];
  }

  return (data ?? []) as WaveLog[];
}
