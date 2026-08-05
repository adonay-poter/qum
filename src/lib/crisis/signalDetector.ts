import { containsDistressLanguage } from '@/lib/crisis/distressLanguage';
import type { Reflection } from '@/types/reflection';
import type { WaveLog } from '@/types/database';

export type CrisisSeverity = 'soft' | 'firm';

export interface CrisisSignalResult {
  showCrisisCard: boolean;
  severity: CrisisSeverity | null;
  /** Client-only; used to include crisis hotlines — never sent to telemetry. */
  distressLanguageDetected: boolean;
}

const MS_48H = 48 * 60 * 60 * 1000;
const CONSECUTIVE_FAILURE_DAYS = 3;

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function countFailedWavesIn48h(waves: WaveLog[], nowMs = Date.now()): number {
  const since = nowMs - MS_48H;
  return waves.filter(
    (w) => !w.completed && new Date(w.started_at).getTime() >= since,
  ).length;
}

function hasConsecutiveFailureDays(
  waves: WaveLog[],
  minDays: number,
  now = new Date(),
): boolean {
  const byDay = new Map<string, { failed: number; completed: number }>();

  for (const wave of waves) {
    const key = localDateKey(wave.started_at);
    const entry = byDay.get(key) ?? { failed: 0, completed: 0 };
    if (wave.completed) entry.completed += 1;
    else entry.failed += 1;
    byDay.set(key, entry);
  }

  let streak = 0;
  for (let offset = 0; offset < 21; offset += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const key = localDateKey(d.toISOString());
    const entry = byDay.get(key);

    if (!entry || entry.failed === 0) {
      if (streak >= minDays) return true;
      streak = 0;
      continue;
    }

    if (entry.completed > 0) {
      if (streak >= minDays) return true;
      streak = 0;
      continue;
    }

    streak += 1;
    if (streak >= minDays) return true;
  }

  return false;
}

function reflectionFreeText(reflection: Reflection): string {
  return [reflection.trigger_other, reflection.location_other, reflection.loophole]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
}

function detectDistressInReflections(reflections: Reflection[]): boolean {
  return reflections.some((r) => containsDistressLanguage(reflectionFreeText(r)));
}

function countActiveSignals(
  waves: WaveLog[],
  reflections: Reflection[],
): { count: number; distressLanguageDetected: boolean } {
  let count = 0;
  let distressLanguageDetected = false;

  if (countFailedWavesIn48h(waves) >= 5) count += 1;
  if (hasConsecutiveFailureDays(waves, CONSECUTIVE_FAILURE_DAYS)) count += 1;

  if (detectDistressInReflections(reflections)) {
    count += 1;
    distressLanguageDetected = true;
  }

  return { count, distressLanguageDetected };
}

/** Pure, client-side distress detection. Never call from server-side code. */
export function detectCrisisSignal(
  waves: WaveLog[],
  reflections: Reflection[],
): CrisisSignalResult {
  const { count, distressLanguageDetected } = countActiveSignals(waves, reflections);

  if (count === 0) {
    return {
      showCrisisCard: false,
      severity: null,
      distressLanguageDetected: false,
    };
  }

  return {
    showCrisisCard: true,
    severity: count >= 2 ? 'firm' : 'soft',
    distressLanguageDetected,
  };
}
