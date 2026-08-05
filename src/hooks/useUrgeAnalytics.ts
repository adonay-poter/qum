import { useCallback, useEffect, useState } from 'react';
import { fetchReflections } from '@/services/reflectionService';
import { fetchWavesLog } from '@/services/waveService';
import type { UrgeHeatmapCell, WaveLog } from '@/types/database';

function buildHeatmap(
  waves: WaveLog[],
  slipOccurredAt: string[],
): UrgeHeatmapCell[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

  for (const wave of waves) {
    const hour = new Date(wave.started_at).getHours();
    buckets[hour].count += 1;
  }

  for (const iso of slipOccurredAt) {
    const hour = new Date(iso).getHours();
    buckets[hour].count += 1;
  }

  return buckets;
}

export function useUrgeAnalytics(userId: string | null) {
  const [waves, setWaves] = useState<WaveLog[]>([]);
  const [heatmap, setHeatmap] = useState<UrgeHeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWaves([]);
      setHeatmap([]);
      return;
    }

    setLoading(true);
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [data, slips] = await Promise.all([
      fetchWavesLog(userId),
      fetchReflections(userId, since),
    ]);
    setWaves(data);
    setHeatmap(buildHeatmap(data, slips.map((r) => r.occurred_at)));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completionRate =
    waves.length === 0
      ? 0
      : Math.round((waves.filter((w) => w.completed).length / waves.length) * 100);

  const peakHour =
    heatmap.length === 0
      ? null
      : heatmap.reduce((max, cell) => (cell.count > max.count ? cell : max), heatmap[0]);

  return {
    waves,
    heatmap,
    loading,
    completionRate,
    peakHour,
    refresh,
  };
}
