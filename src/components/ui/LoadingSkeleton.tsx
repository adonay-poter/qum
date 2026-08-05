import { HaltBarLoader } from '@/design-system/identity';

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-secondary/25 ${className}`} />;
}

export function AnalyticsHeatmapSkeleton() {
  return (
    <div className="flex flex-col gap-qum-lg" aria-busy="true" aria-label="Loading urge analytics">
      <div className="flex justify-center py-2">
        <HaltBarLoader height={24} />
      </div>
      <div className="grid grid-cols-2 gap-qum-md border border-secondary/30 bg-surface p-qum-md">
        <div className="space-y-2">
          <Bar className="h-3 w-28" />
          <Bar className="h-8 w-14" />
        </div>
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-8 w-12" />
        </div>
      </div>
      <div>
        <Bar className="h-3 w-32" />
        <div className="mt-qum-md grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <Bar key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PatternBreakdownSkeleton() {
  return (
    <div
      className="border border-secondary/30 bg-surface p-qum-md"
      aria-busy="true"
      aria-label="Loading pattern breakdown"
    >
      <Bar className="h-3 w-36" />
      <div className="mt-qum-md space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Bar className="h-4 w-32" />
            <Bar className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
