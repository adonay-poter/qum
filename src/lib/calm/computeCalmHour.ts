const AWAKE_START = 7;
const AWAKE_END = 23;
const MIN_EVENTS = 5;

/** Lowest-activity awake hour from urge/slip timestamps; fallback 10:00 or inverse of peak. */
export function computeCalmHour(options: {
  eventHours: number[];
  peakDangerHour: number | null;
  defaultHour?: number;
}): number {
  const fallback = options.defaultHour ?? 10;
  const buckets = Array.from({ length: 24 }, () => 0);

  for (const hour of options.eventHours) {
    if (hour >= 0 && hour < 24) buckets[hour] += 1;
  }

  const total = buckets.reduce((sum, n) => sum + n, 0);

  if (total < MIN_EVENTS) {
    if (options.peakDangerHour != null) {
      return (options.peakDangerHour + 12) % 24;
    }
    return fallback;
  }

  let calmHour = fallback;
  let minCount = Infinity;

  for (let h = AWAKE_START; h <= AWAKE_END; h += 1) {
    if (buckets[h] < minCount) {
      minCount = buckets[h];
      calmHour = h;
    }
  }

  return calmHour;
}

export function extractHourFromIso(iso: string): number {
  return new Date(iso).getHours();
}
