import type { Reflection, ReflectionLocation, ReflectionTrigger } from '@/types/reflection';

export interface RankedTrigger {
  rank: number;
  trigger: ReflectionTrigger;
  label: string;
  count: number;
}

export interface PatternBreakdown {
  topTriggers: RankedTrigger[];
  highestRiskLocation: { location: ReflectionLocation; label: string; rate: number } | null;
  combinedPattern: { trigger: ReflectionTrigger; location: ReflectionLocation; rate: number } | null;
}

const TRIGGER_LABELS: Record<ReflectionTrigger, string> = {
  boredom: 'Boredom',
  stress: 'Stress',
  loneliness: 'Loneliness',
  fatigue: 'Fatigue',
  anger: 'Anger',
  celebration: 'Celebration',
  other: 'Other',
};

const LOCATION_LABELS: Record<ReflectionLocation, string> = {
  bed: 'Bed',
  desk: 'Desk',
  bathroom: 'Bathroom',
  couch: 'Couch',
  kitchen: 'Kitchen',
  commute: 'Commute',
  outdoors: 'Outdoors',
  other: 'Other',
};

export function buildPatternBreakdown(reports: Reflection[]): PatternBreakdown {
  if (!reports.length) {
    return { topTriggers: [], highestRiskLocation: null, combinedPattern: null };
  }

  const triggerCounts = new Map<ReflectionTrigger, number>();
  const locationCounts = new Map<ReflectionLocation, number>();
  const comboCounts = new Map<string, number>();

  for (const report of reports) {
    if (!report.trigger || !report.location) continue;
    triggerCounts.set(report.trigger, (triggerCounts.get(report.trigger) ?? 0) + 1);
    locationCounts.set(report.location, (locationCounts.get(report.location) ?? 0) + 1);
    const key = `${report.trigger}:${report.location}`;
    comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
  }

  const topTriggers: RankedTrigger[] = [...triggerCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([trigger, count], index) => ({
      rank: index + 1,
      trigger,
      label: TRIGGER_LABELS[trigger],
      count,
    }));

  let highestRiskLocation: PatternBreakdown['highestRiskLocation'] = null;
  let bestRate = 0;
  for (const [location, count] of locationCounts) {
    if (count < 3) continue;
    const rate = Math.round((count / reports.length) * 100);
    if (rate > bestRate) {
      bestRate = rate;
      highestRiskLocation = { location, label: LOCATION_LABELS[location], rate };
    }
  }

  let combinedPattern: PatternBreakdown['combinedPattern'] = null;
  if (reports.length >= 5) {
    let bestComboRate = 0;
    let bestKey = '';
    for (const [key, count] of comboCounts) {
      const rate = count / reports.length;
      if (rate > 0.4 && rate * 100 > bestComboRate) {
        bestComboRate = Math.round(rate * 100);
        bestKey = key;
      }
    }
    if (bestKey) {
      const [trigger, location] = bestKey.split(':') as [ReflectionTrigger, ReflectionLocation];
      combinedPattern = { trigger, location, rate: bestComboRate };
    }
  }

  return { topTriggers, highestRiskLocation, combinedPattern };
}

export { TRIGGER_LABELS, LOCATION_LABELS };
