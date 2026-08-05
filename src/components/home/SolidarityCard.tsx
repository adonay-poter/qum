import { useMemo, useState } from 'react';
import { trackEvent } from '@/services/telemetryService';
import type { SolidarityHourlyPoint } from '@/services/solidarityService';

interface SolidarityCardProps {
  activeNow: number;
  surfsToday: number;
  hourly: SolidarityHourlyPoint[];
  loading?: boolean;
}

const SPARK_W = 280;
const SPARK_H = 48;
const SPARK_PAD = 4;

function hourBucketMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
}

function buildSparklinePoints(hourly: SolidarityHourlyPoint[]): number[] {
  const buckets = new Map(
    hourly.map((p) => [hourBucketMs(new Date(p.hourBucket)), p.waveStarts]),
  );

  const points: number[] = [];
  const now = Date.now();
  for (let i = 23; i >= 0; i -= 1) {
    const t = new Date(now - i * 60 * 60 * 1000);
    points.push(buckets.get(hourBucketMs(t)) ?? 0);
  }
  return points;
}

function Sparkline({ values }: { values: number[] }) {
  const path = useMemo(() => {
    if (!values.length) return '';
    const max = Math.max(1, ...values);
    const innerW = SPARK_W - SPARK_PAD * 2;
    const innerH = SPARK_H - SPARK_PAD * 2;
    const step = values.length > 1 ? innerW / (values.length - 1) : 0;

    return values
      .map((v, i) => {
        const x = SPARK_PAD + i * step;
        const y = SPARK_PAD + innerH - (v / max) * innerH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className="mt-3 w-full text-tertiary"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SolidarityCard({
  activeNow,
  surfsToday,
  hourly,
  loading,
}: SolidarityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const sparkValues = useMemo(() => buildSparklinePoints(hourly), [hourly]);

  const peopleLabel = activeNow === 1 ? 'person' : 'people';

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) trackEvent('solidarity_card_tapped');
  };

  return (
    <div className="mb-3 rounded-lg border bg-surface/30 backdrop-blur-md px-4 py-3 transition-all duration-300 animate-ambient-glow">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className="flex-1 flex items-center justify-center gap-2 text-[0.72rem] leading-snug text-secondary"
        >
          {!loading && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
          )}
          {loading ? (
            <span>Checking the room…</span>
          ) : (
            <span>
              <span className="text-primary font-semibold">{activeNow}</span> {peopleLabel} surfing right
              now · <span className="text-primary font-semibold">{surfsToday}</span> today
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowPrivacy((v) => !v)}
          className="shrink-0 px-1.5 py-0.5 rounded-full border border-secondary/30 text-[0.62rem] text-secondary/70 bg-surface/50 hover:text-primary transition-colors"
          aria-label="Privacy information"
        >
          ?
        </button>
      </div>

      {showPrivacy && (
        <p className="mt-2 text-left text-[0.65rem] leading-relaxed text-secondary border-t border-secondary/15 pt-2">
          We only count waves, never people. No one sees you.
        </p>
      )}

      {expanded && (
        <div className="mt-3 border-t border-secondary/15 pt-3">
          <p className="text-[0.6rem] uppercase tracking-wider text-secondary/60 text-center">
            Surfs started · last 24h
          </p>
          <Sparkline values={sparkValues} />
        </div>
      )}
    </div>
  );
}
