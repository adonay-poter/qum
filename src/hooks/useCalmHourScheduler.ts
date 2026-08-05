import { useEffect } from 'react';
import { computeCalmHour, extractHourFromIso } from '@/lib/calm/computeCalmHour';
import { getIsoWeekKey } from '@/lib/calm/calmHourWeek';
import { fetchReflections } from '@/services/reflectionService';
import { fetchWavesLog } from '@/services/waveService';
import { scheduleCalmHourCheckIn } from '@/services/notificationService';
import { readCalmHourPrefs } from '@/lib/storage/calmHourPrefs';
import { useProfileStore } from '@/stores/profileStore';

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Computes the user's calmest awake hour from wave + slip history and schedules
 * a weekly local notification (default Sunday). Deduped per ISO week via appStorage.
 */
export function useCalmHourScheduler(userId: string | null, enabled: boolean): void {
  const profile = useProfileStore((s) => s.profile);

  useEffect(() => {
    if (!userId || !enabled) return;

    let cancelled = false;

    void (async () => {
      const since = new Date(Date.now() - LOOKBACK_MS).toISOString();
      const [waves, slips] = await Promise.all([
        fetchWavesLog(userId),
        fetchReflections(userId, since),
      ]);

      if (cancelled) return;

      const eventHours = [
        ...waves.map((w) => extractHourFromIso(w.started_at)),
        ...slips.map((s) => extractHourFromIso(s.occurred_at)),
      ];

      const prefs = readCalmHourPrefs();
      const computedHour = computeCalmHour({
        eventHours,
        peakDangerHour: profile?.peak_danger_hour ?? null,
      });

      await scheduleCalmHourCheckIn({
        hour: prefs.hour ?? computedHour,
        weekday: prefs.weekday,
        isoWeekKey: getIsoWeekKey(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled, profile?.peak_danger_hour]);
}
