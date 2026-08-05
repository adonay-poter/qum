export type ResilienceEventType =
  | 'wave_completed'
  | 'wave_failed'
  | 'reflection_submitted'
  | 'calm_hour_completed'
  | 'commitment_broken';

export interface ResilienceEvent {
  type: ResilienceEventType;
  /** Event timestamp (epoch ms). */
  at: number;
}

export interface ResilienceBreakdownRow {
  component: string;
  contribution: number;
}

export const RESILIENCE_BASE = 50;
export const RESILIENCE_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const SIGNAL_CONFIG: Record<
  ResilienceEventType,
  { perEvent: number; cap: number; label: string }
> = {
  wave_completed: { perEvent: 2, cap: 30, label: 'Waves surfed' },
  wave_failed: { perEvent: -1, cap: -10, label: 'Waves ended early' },
  reflection_submitted: { perEvent: 1, cap: 10, label: 'Reflections' },
  calm_hour_completed: { perEvent: 5, cap: 15, label: 'Calm hours' },
  commitment_broken: { perEvent: -2, cap: -10, label: 'Commitments marked broken' },
};

function windowStartMs(now: Date): number {
  return now.getTime() - RESILIENCE_WINDOW_DAYS * DAY_MS;
}

function eventsInWindow(events: ResilienceEvent[], now: Date): ResilienceEvent[] {
  const start = windowStartMs(now);
  return events.filter((e) => e.at >= start);
}

function sumContribution(type: ResilienceEventType, count: number): number {
  const { perEvent, cap } = SIGNAL_CONFIG[type];
  if (count <= 0) return 0;
  const raw = count * perEvent;
  if (cap >= 0) return Math.min(raw, cap);
  return Math.max(raw, cap);
}

/**
 * Current-state resilience from a 30-day rolling window.
 * Empty window + prior activity → holds `previousLevel`.
 * No events ever → base 50.
 */
export function computeResilience(
  events: ResilienceEvent[],
  now: Date,
  previousLevel?: number,
): number {
  const inWindow = eventsInWindow(events, now);

  if (inWindow.length === 0) {
    if (events.length === 0) return RESILIENCE_BASE;
    return clampResilience(previousLevel ?? RESILIENCE_BASE);
  }

  const counts: Record<ResilienceEventType, number> = {
    wave_completed: 0,
    wave_failed: 0,
    reflection_submitted: 0,
    calm_hour_completed: 0,
    commitment_broken: 0,
  };

  for (const e of inWindow) {
    counts[e.type] += 1;
  }

  let score = RESILIENCE_BASE;
  for (const type of Object.keys(SIGNAL_CONFIG) as ResilienceEventType[]) {
    score += sumContribution(type, counts[type]);
  }

  return clampResilience(score);
}

export function getResilienceBreakdown(
  events: ResilienceEvent[],
  now: Date,
): ResilienceBreakdownRow[] {
  const inWindow = eventsInWindow(events, now);
  const counts: Record<ResilienceEventType, number> = {
    wave_completed: 0,
    wave_failed: 0,
    reflection_submitted: 0,
    calm_hour_completed: 0,
    commitment_broken: 0,
  };

  for (const e of inWindow) {
    counts[e.type] += 1;
  }

  return (Object.keys(SIGNAL_CONFIG) as ResilienceEventType[]).map((type) => {
    const { label } = SIGNAL_CONFIG[type];
    const count = counts[type];
    return {
      component: count > 0 ? `${label} (${count})` : label,
      contribution: sumContribution(type, count),
    };
  });
}

export function clampResilience(value: number): number {
  if (!Number.isFinite(value)) return RESILIENCE_BASE;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function resilienceSubtitle(level: number): string | null {
  if (level >= 75) return 'Steady.';
  if (level < 40) return 'Be gentle with yourself this week.';
  return null;
}
