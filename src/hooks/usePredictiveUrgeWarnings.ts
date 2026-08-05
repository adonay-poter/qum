import { useEffect } from 'react';
import { scheduleUrgeWarning } from '@/services/notificationService';
import { fetchRecentWaves } from '@/services/waveService';
import { useProfileStore } from '@/stores/profileStore';
import { updateProfileFields } from '@/services/profileService';
import type { WaveLog } from '@/types/database';

interface HourStats {
  hour: number;
  activations: number;
  failures: number;
}

function analyzePeakRiskHour(waves: WaveLog[]): number | null {
  if (waves.length < 3) return null;

  const buckets: HourStats[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    activations: 0,
    failures: 0,
  }));

  for (const wave of waves) {
    if (!wave.started_at) continue;
    const hour = new Date(wave.started_at).getHours();
    buckets[hour].activations += 1;
    if (!wave.completed) buckets[hour].failures += 1;
  }

  let best: HourStats | null = null;
  let bestScore = -1;
  for (const b of buckets) {
    const score = b.activations + b.failures * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }

  return best && bestScore > 0 ? best.hour : null;
}

export function usePredictiveUrgeWarnings(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const runAnalysis = async () => {
      try {
        const waves = await fetchRecentWaves(userId, 30); // Analyze past 30 days of data for richer insights
        const peakHour = analyzePeakRiskHour(waves);
        if (peakHour === null) return;

        const profileStore = useProfileStore.getState();
        const currentProfile = profileStore.profile;

        if (currentProfile && currentProfile.peak_danger_hour !== peakHour) {
          console.log(`[Predictive Warning] Peak danger hour shifted from ${currentProfile.peak_danger_hour} to ${peakHour}. Updating database & store cache.`);
          const updated = await updateProfileFields(userId, { peak_danger_hour: peakHour });
          if (updated) {
            profileStore.setProfile(updated);
          }
        }

        void scheduleUrgeWarning(peakHour);
      } catch (err) {
        console.error('[Predictive Warning] Failed to recalculate dynamic peak warning hour:', err);
      }
    };

    void runAnalysis();
  }, [userId]);
}

export { analyzePeakRiskHour };
