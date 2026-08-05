import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { WavesList } from '@/components/home/WavesList';
import { fetchWavesLog } from '@/services/waveService';
import type { WaveLog } from '@/types/database';

interface AllWavesScreenProps {
  userId: string;
  onReflect: (waveId: string) => void;
  onDone: () => void;
}

export function AllWavesScreen({ userId, onReflect, onDone }: AllWavesScreenProps) {
  const [waves, setWaves] = useState<WaveLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data = await fetchWavesLog(userId);
      if (!cancelled) {
        setWaves(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Page>
      <div className="flex h-full min-h-0 flex-col py-4">
        <button
          type="button"
          onClick={onDone}
          aria-label="Back to home"
          className="self-start px-2 py-1 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Your waves</h1>
        <p className="mt-2 text-body text-secondary">
          Tap a wave to reflect when you&apos;re ready. Waves you&apos;ve already reflected on
          are marked.
        </p>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-body text-secondary">Loading waves…</p>
          ) : (
            <WavesList waves={waves} onReflect={onReflect} />
          )}
        </div>
      </div>
    </Page>
  );
}
