import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaveEndToastProps {
  message: string | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function WaveEndToast({ message, onDismiss }: WaveEndToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--qum-safe-bottom)+1rem)] z-[90] flex justify-center px-qum-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
        >
          <p className="max-w-sm border border-secondary/40 bg-surface px-4 py-3 text-center text-body text-primary shadow-lg">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
