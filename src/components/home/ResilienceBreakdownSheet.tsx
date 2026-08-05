import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  computeResilience,
  getResilienceBreakdown,
  RESILIENCE_BASE,
  type ResilienceEvent,
} from '@/lib/resilience/resilienceModel';
import { fetchResilienceEvents } from '@/services/resilienceEventsService';

interface ResilienceBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentLevel: number;
}

export function ResilienceBreakdownSheet({
  open,
  onClose,
  userId,
  currentLevel,
}: ResilienceBreakdownSheetProps) {
  const [events, setEvents] = useState<ResilienceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchResilienceEvents(userId).then((data) => {
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const now = new Date();
  const breakdown = getResilienceBreakdown(events, now);
  const modeled = computeResilience(events, now, currentLevel);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close breakdown"
            className="fixed inset-0 z-[80] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="resilience-breakdown-title"
            className="fixed inset-x-0 bottom-0 z-[81] max-h-[70vh] overflow-y-auto border-t border-secondary/40 bg-surface px-qum-md pb-[calc(var(--qum-safe-bottom)+1rem)] pt-qum-md shadow-lg"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <p id="resilience-breakdown-title" className="text-label uppercase text-secondary">
              What goes into this?
            </p>
            <p className="mt-2 text-body text-secondary">
              Your shield reflects the last 30 days — waves, reflections, calm hours, and honest
              commitment check-ins. No penalty for time away.
            </p>

            {loading ? (
              <p className="mt-qum-md text-body text-secondary">Loading…</p>
            ) : (
              <ul className="mt-qum-md space-y-2">
                <li className="flex justify-between text-body text-primary">
                  <span>Base</span>
                  <span>+{RESILIENCE_BASE}</span>
                </li>
                {breakdown.map((row) => (
                  <li key={row.component} className="flex justify-between text-body text-primary">
                    <span>{row.component}</span>
                    <span>
                      {row.contribution > 0 ? '+' : ''}
                      {row.contribution}
                    </span>
                  </li>
                ))}
                <li className="mt-2 flex justify-between border-t border-secondary/30 pt-2 text-body font-semibold text-primary">
                  <span>Modeled total</span>
                  <span>{modeled}</span>
                </li>
              </ul>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-qum-lg w-full border border-secondary/30 py-3 text-body text-secondary"
            >
              Close
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
