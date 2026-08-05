import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { fetchReflections } from '@/services/reflectionService';
import {
  REFLECTION_LOCATIONS,
  REFLECTION_TRIGGERS,
  type Reflection,
} from '@/types/reflection';

const LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;

function labelForTrigger(id: string | null, other: string | null): string {
  if (!id) return other?.trim() || '—';
  if (id === 'other') return other?.trim() || 'Other';
  return REFLECTION_TRIGGERS.find((t) => t.id === id)?.label ?? id;
}

function labelForLocation(id: string | null, other: string | null): string {
  if (!id) return other?.trim() || '—';
  if (id === 'other') return other?.trim() || 'Other';
  return REFLECTION_LOCATIONS.find((l) => l.id === id)?.label ?? id;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ReflectionsHistoryScreenProps {
  userId: string;
  onDone: () => void;
}

export function ReflectionsHistoryScreen({ userId, onDone }: ReflectionsHistoryScreenProps) {
  const [items, setItems] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const since = new Date(Date.now() - LOOKBACK_MS).toISOString();
      const rows = await fetchReflections(userId, since);
      if (!cancelled) {
        setItems(rows);
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
          aria-label="Back to settings"
          className="self-start px-2 py-1 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Reflection history</h1>
        <p className="mt-2 text-body text-secondary">
          Voluntary notes you chose to save. Nothing here is shared.
        </p>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          {loading && <p className="text-body text-secondary">Loading…</p>}
          {!loading && items.length === 0 && (
            <p className="text-body text-secondary">No reflections yet.</p>
          )}
          {!loading && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="border border-secondary/25 bg-surface/80 px-3 py-3"
                >
                  <p className="text-[0.68rem] uppercase tracking-[0.1em] text-secondary">
                    {formatWhen(row.occurred_at)} · {row.mode.replace('_', ' ')}
                  </p>
                  <p className="mt-2 text-body text-primary">
                    {labelForTrigger(row.trigger, row.trigger_other)}
                    {row.location || row.location_other
                      ? ` · ${labelForLocation(row.location, row.location_other)}`
                      : ''}
                  </p>
                  {row.loophole?.trim() && (
                    <p className="mt-1 text-[0.72rem] text-secondary">{row.loophole}</p>
                  )}
                  {(row.trigger_audio_path ||
                    row.location_audio_path ||
                    row.loophole_audio_path) && (
                    <p className="mt-1 text-[0.65rem] text-secondary/70">Includes voice note</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Page>
  );
}
