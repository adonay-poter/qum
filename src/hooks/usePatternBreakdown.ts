import { useCallback, useEffect, useState } from 'react';
import { fetchReflections } from '@/services/reflectionService';
import { readReflectionsOutbox } from '@/lib/storage/reflectionsOutbox';
import {
  buildPatternBreakdown,
  type PatternBreakdown,
} from '@/lib/analytics/patternBreakdown';
import type { Reflection } from '@/types/reflection';

const DAY_MS = 24 * 60 * 60 * 1000;

function mergeWithOutbox(
  remote: Reflection[],
  userId: string,
  sinceMs: number,
): Reflection[] {
  const seen = new Set(remote.map((r) => r.id));
  const pending = readReflectionsOutbox()
    .filter((item) => {
      if (item.userId !== userId) return false;
      const occurred = item.payload.occurred_at ?? item.clientCreatedAt;
      return new Date(occurred).getTime() >= sinceMs;
    })
    .map(
      (item): Reflection => ({
        id: item.id,
        user_id: item.userId,
        wave_id: item.waveId,
        mode: item.mode,
        ended_in: null,
        trigger: item.payload.trigger ?? null,
        trigger_other: item.payload.trigger_other ?? null,
        trigger_audio_path: item.payload.trigger_audio_path ?? null,
        location: item.payload.location ?? null,
        location_other: item.payload.location_other ?? null,
        location_audio_path: item.payload.location_audio_path ?? null,
        loophole: item.payload.loophole ?? null,
        loophole_audio_path: item.payload.loophole_audio_path ?? null,
        occurred_at: item.payload.occurred_at ?? item.clientCreatedAt,
        created_at: item.clientCreatedAt,
        client_created_at: item.clientCreatedAt,
        synced: false,
      }),
    )
    .filter((r) => !seen.has(r.id));

  return [...remote, ...pending];
}

export function usePatternBreakdown(userId: string | null, sinceDays = 30) {
  const [breakdown, setBreakdown] = useState<PatternBreakdown>({
    topTriggers: [],
    highestRiskLocation: null,
    combinedPattern: null,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBreakdown({
        topTriggers: [],
        highestRiskLocation: null,
        combinedPattern: null,
      });
      return;
    }

    setLoading(true);
    const sinceMs = Date.now() - sinceDays * DAY_MS;
    const since = new Date(sinceMs).toISOString();
    const remote = await fetchReflections(userId, since);
    const reports = mergeWithOutbox(remote, userId, sinceMs);
    setBreakdown(buildPatternBreakdown(reports));
    setLoading(false);
  }, [userId, sinceDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { breakdown, loading, refresh };
}
