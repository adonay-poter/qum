import { motion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { scalePop } from '@/lib/motion';

interface RageQuitOverlayProps {
  onDismiss: () => void;
}

export function RageQuitOverlay({ onDismiss }: RageQuitOverlayProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral/95 px-qum-lg pt-[var(--qum-safe-top)] pb-[var(--qum-safe-bottom)]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="wave-ended-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="max-w-md border border-secondary/40 bg-surface p-qum-lg text-center"
        variants={scalePop}
        initial="initial"
        animate="animate"
      >
        <p className="text-label uppercase text-tertiary">Stepped away</p>
        <h2 id="wave-ended-title" className="mt-qum-sm text-h1 text-primary">
          That&apos;s okay
        </h2>
        <p className="mt-qum-md text-body text-secondary">
          You stepped away from a wave. That&apos;s okay. The wave is over — you can start fresh
          whenever you&apos;re ready.
        </p>
        <motion.button
          type="button"
          onClick={() => {
            haptic.light();
            onDismiss();
          }}
          aria-label="Dismiss message"
          className="mt-qum-lg bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
          whileTap={{ scale: 0.97 }}
        >
          Got it
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
