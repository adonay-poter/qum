import { motion } from 'framer-motion';
import { PatternBreakdownSkeleton } from '@/components/ui/LoadingSkeleton';
import { staggerItem } from '@/lib/motion';
import { LOCATION_LABELS, TRIGGER_LABELS } from '@/lib/analytics/patternBreakdown';
import type { PatternBreakdown } from '@/lib/analytics/patternBreakdown';

interface PatternBreakdownProps {
  breakdown: PatternBreakdown;
  loading: boolean;
  periodLabel?: string;
  compact?: boolean;
}

export function PatternBreakdownSection({
  breakdown,
  loading,
  periodLabel = '30d',
  compact = false,
}: PatternBreakdownProps) {
  if (loading) {
    return (
      <motion.div variants={staggerItem} className="flex flex-col gap-qum-md">
        <p className="text-label uppercase text-secondary">
          Pattern breakdown{periodLabel ? ` (${periodLabel})` : ''}
        </p>
        <PatternBreakdownSkeleton />
      </motion.div>
    );
  }

  const hasData =
    breakdown.topTriggers.length > 0 ||
    breakdown.highestRiskLocation ||
    breakdown.combinedPattern;

  if (!hasData) {
    return (
      <motion.div variants={staggerItem} className="border border-secondary/30 bg-surface p-qum-md">
        <p className="text-label uppercase text-secondary">
          Pattern breakdown ({periodLabel})
        </p>
        <p className="mt-2 text-body text-secondary">
          File incident logs after slips to unlock trigger and location patterns.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerItem} className="flex flex-col gap-qum-md">
      <p className="text-label uppercase text-secondary">
        Pattern breakdown ({periodLabel})
      </p>
      <motion.div
        className={`grid gap-qum-md border border-secondary/30 bg-surface ${compact ? 'p-3' : 'p-qum-md'}`}
      >
        {breakdown.topTriggers.length > 0 && (
          <motion.div>
            <p className="text-label uppercase text-secondary">Top triggers</p>
            <ol className="mt-qum-md space-y-2">
              {breakdown.topTriggers.map((item) => (
                <li
                  key={item.trigger}
                  className="flex items-baseline justify-between gap-3 border-b border-secondary/20 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-body text-primary">
                    <span className="mr-2 font-mono text-secondary">#{item.rank}</span>
                    {item.label}
                  </span>
                  <span className="shrink-0 font-mono text-body text-secondary">×{item.count}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
        {breakdown.highestRiskLocation && (
          <motion.div>
            <p className="text-label uppercase text-secondary">Highest-risk location</p>
            <p className="mt-1 text-h1 text-primary">
              {breakdown.highestRiskLocation.label}
              <span className="ml-2 text-body text-secondary">
                {breakdown.highestRiskLocation.rate}% of slips
              </span>
            </p>
          </motion.div>
        )}
        {breakdown.combinedPattern && (
          <motion.div>
            <p className="text-label uppercase text-secondary">Combined pattern</p>
            <p className="mt-1 text-body text-primary">
              {TRIGGER_LABELS[breakdown.combinedPattern.trigger]} +{' '}
              {LOCATION_LABELS[breakdown.combinedPattern.location]} —{' '}
              {breakdown.combinedPattern.rate}% of reports
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
