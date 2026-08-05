import { formatRelativeTime } from '@/lib/dates/formatRelativeTime';
import type { WaveLog } from '@/types/database';

interface WavesListProps {
  waves: WaveLog[];
  onReflect: (waveId: string) => void;
}

export function WavesList({ waves, onReflect }: WavesListProps) {
  if (!waves.length) {
    return <p className="text-body text-secondary">No waves in this period yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {waves.map((wave) => (
        <li key={wave.id}>
          <button
            type="button"
            disabled={Boolean(wave.audit_id)}
            onClick={() => onReflect(wave.id)}
            aria-label={
              wave.audit_id
                ? `Wave from ${formatRelativeTime(wave.started_at)}, already reflected`
                : `Reflect on wave from ${formatRelativeTime(wave.started_at)}`
            }
            className="flex w-full items-center justify-between gap-2 border border-secondary/20 bg-surface/60 px-3 py-2.5 text-left text-body text-primary disabled:opacity-50"
          >
            <span>
              {wave.completed ? 'Surf completed' : 'Wave ended'}{' '}
              <span className="text-secondary">· {formatRelativeTime(wave.started_at)}</span>
            </span>
            {wave.audit_id ? (
              <span className="shrink-0 text-[0.6rem] uppercase text-tertiary">Reflected</span>
            ) : (
              <span className="shrink-0 text-[0.6rem] uppercase text-secondary">Reflect →</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
