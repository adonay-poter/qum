import { supabase } from '@/lib/supabase';

export interface SolidaritySummary {
  activeNow: number;
  surfsToday: number;
}

export interface SolidarityHourlyPoint {
  hourBucket: string;
  waveStarts: number;
}

export async function fetchSolidaritySummary(): Promise<SolidaritySummary | null> {
  const { data, error } = await supabase
    .from('public_solidarity_view')
    .select('active_now, surfs_today')
    .maybeSingle();

  if (error) {
    console.error('fetchSolidaritySummary', error);
    return null;
  }

  if (!data) return { activeNow: 0, surfsToday: 0 };

  return {
    activeNow: Number(data.active_now) || 0,
    surfsToday: Number(data.surfs_today) || 0,
  };
}

export async function fetchSolidarityHourly(): Promise<SolidarityHourlyPoint[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('active_waves_ticker')
    .select('hour_bucket, wave_starts')
    .gte('hour_bucket', since)
    .order('hour_bucket', { ascending: true });

  if (error) {
    console.error('fetchSolidarityHourly', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    hourBucket: row.hour_bucket as string,
    waveStarts: Number(row.wave_starts) || 0,
  }));
}
