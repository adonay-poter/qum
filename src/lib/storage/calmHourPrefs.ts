import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { DEFAULT_CALM_HOUR_WEEKDAY } from '@/types/calmHour';

export interface CalmHourPrefs {
  weekday: number;
  /** When null, scheduler uses the computed calmest hour from activity. */
  hour: number | null;
}

export function readCalmHourPrefs(): CalmHourPrefs {
  const stored = readJson<CalmHourPrefs>(STORAGE_KEYS.CALM_HOUR_PREFS);
  const weekday =
    typeof stored?.weekday === 'number' && stored.weekday >= 0 && stored.weekday <= 6
      ? stored.weekday
      : DEFAULT_CALM_HOUR_WEEKDAY;
  const hour =
    typeof stored?.hour === 'number' && stored.hour >= 0 && stored.hour <= 23
      ? stored.hour
      : null;
  return { weekday, hour };
}

export function writeCalmHourPrefs(prefs: CalmHourPrefs): void {
  writeJson(STORAGE_KEYS.CALM_HOUR_PREFS, prefs);
}
