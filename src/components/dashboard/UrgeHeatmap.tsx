import { AnalyticsHeatmapSkeleton } from '@/components/ui/LoadingSkeleton';
import type { UrgeHeatmapCell } from '@/types/database';

interface UrgeHeatmapProps {
  cells: UrgeHeatmapCell[];
  peakHour: UrgeHeatmapCell | null;
  completionRate: number;
  loading: boolean;
}

export function UrgeHeatmap({ cells, peakHour, completionRate, loading }: UrgeHeatmapProps) {
  const maxCount = Math.max(1, ...cells.map((c) => c.count));

  if (loading) {
    return <AnalyticsHeatmapSkeleton />;
  }

  return (
    <div className="flex flex-col gap-qum-lg">
      <div className="grid grid-cols-2 gap-qum-md border border-secondary/30 bg-surface p-qum-md">
        <div>
          <p className="text-label uppercase text-secondary">Completion rate</p>
          <p className="mt-1 text-h1 text-primary">{completionRate}%</p>
        </div>
        <div>
          <p className="text-label uppercase text-secondary">Peak urge hour</p>
          <p className="mt-1 text-h1 text-primary">
            {peakHour && peakHour.count > 0
              ? `${peakHour.hour.toString().padStart(2, '0')}:00`
              : '—'}
          </p>
        </div>
      </div>

      <div>
        <p className="text-label uppercase text-secondary">Urges by hour</p>
        <div className="mt-qum-md grid grid-cols-12 gap-1">
          {cells.map((cell) => {
            const intensity = cell.count / maxCount;
            return (
              <div key={cell.hour} className="flex flex-col items-center gap-1">
                <div
                  title={`${cell.hour}:00 — ${cell.count} urges`}
                  className="h-10 w-full border border-secondary/20"
                  style={{
                    backgroundColor: `rgba(255, 107, 26, ${0.08 + intensity * 0.92})`,
                  }}
                />
                <span className="text-[0.55rem] text-secondary">{cell.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
