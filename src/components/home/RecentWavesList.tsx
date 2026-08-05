import { WavesList } from './WavesList';
import type { WaveLog } from '@/types/database';

export const HOME_RECENT_WAVES_LIMIT = 3;

interface RecentWavesListProps {
  waves: WaveLog[];
  loading: boolean;
  limit?: number;
  onReflect: (waveId: string) => void;
  onSeeAll?: () => void;
}

export function RecentWavesList({
  waves,
  loading,
  limit = HOME_RECENT_WAVES_LIMIT,
  onReflect,
  onSeeAll,
}: RecentWavesListProps) {
  if (loading) {
    return (
      <p className="text-[0.68rem] uppercase tracking-[0.12em] text-secondary/55">
        Loading recent waves…
      </p>
    );
  }

  if (!waves.length) {
    return null;
  }

  const preview = waves.slice(0, limit);
  const showSeeAllLink = Boolean(onSeeAll) && waves.length > 0;

  return (
    <section className="mt-4 border border-secondary/20 bg-surface/30 backdrop-blur-sm p-4 rounded-lg">
      <p className="text-label uppercase text-secondary">Recent waves</p>
      <div className="mt-2">
        <WavesList waves={preview} onReflect={onReflect} />
      </div>
      {showSeeAllLink && (
        <button
          type="button"
          onClick={onSeeAll}
          aria-label="See all waves"
          className="mt-3 w-full py-2 text-center text-[0.68rem] font-normal uppercase tracking-[0.12em] text-secondary/70"
        >
          See all waves →
        </button>
      )}
    </section>
  );
}
