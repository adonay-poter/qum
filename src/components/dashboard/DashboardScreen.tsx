import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUrgeAnalytics } from '@/hooks/useUrgeAnalytics';

import { Page } from '@/components/layout/Page';
import { UrgeHeatmap } from './UrgeHeatmap';
import { PatternBreakdownSection } from './PatternBreakdown';
import { usePatternBreakdown } from '@/hooks/usePatternBreakdown';
import { useCalmHour } from '@/hooks/useCalmHour';
import { RefreshIcon } from '@/components/ui/RefreshIcon';
import { staggerContainer, staggerItem } from '@/lib/motion';

interface DashboardScreenProps {
  userId: string;
  onStartCalmHour?: () => void;
}

export function DashboardScreen({ userId, onStartCalmHour }: DashboardScreenProps) {
  const { heatmap, peakHour, completionRate, loading, refresh } =
    useUrgeAnalytics(userId);
  const { breakdown, loading: patternsLoading, refresh: refreshPatterns } =
    usePatternBreakdown(userId);
  const [refreshing, setRefreshing] = useState(false);
  const calmHour = useCalmHour(userId);


  const handleRefresh = () => {
    setRefreshing(true);
    void Promise.all([refresh(), refreshPatterns()]).finally(() => setRefreshing(false));
  };

  return (
    <Page>
      <motion.div
        className="flex flex-col gap-6 py-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="flex items-start justify-between gap-3"
          variants={staggerItem}
        >
          <div>
            <h1 className="text-h1 text-primary">Urge analytics</h1>
            <p className="mt-1 text-body text-secondary">When cravings spike during your day.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading || patternsLoading}
            aria-label="Refresh data"
            className="flex h-10 w-10 items-center justify-center border border-secondary/30 text-secondary bg-surface/30 rounded backdrop-blur-sm disabled:opacity-40 shrink-0"
          >
            <RefreshIcon
              className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="flex flex-wrap items-center justify-between gap-3 border border-secondary/30 bg-surface p-4"
        >
          <div>
            <p className="text-label uppercase text-secondary">Calm-hour streak</p>
            <p className="mt-1 text-h1 text-primary">
              {calmHour.loading ? '—' : `${calmHour.streak} week${calmHour.streak === 1 ? '' : 's'}`}
            </p>
          </div>
          {onStartCalmHour && (
            <button
              type="button"
              onClick={onStartCalmHour}
              className="border border-tertiary/50 px-4 py-2 text-body text-primary"
            >
              Start calm-hour check-in
            </button>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <UrgeHeatmap
            cells={heatmap}
            peakHour={peakHour}
            completionRate={completionRate}
            loading={loading}
          />
        </motion.div>

        <PatternBreakdownSection breakdown={breakdown} loading={patternsLoading} />
      </motion.div>
    </Page>
  );
}
