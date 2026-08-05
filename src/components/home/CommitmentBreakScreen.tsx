import { motion } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { fadeUp } from '@/lib/motion';

interface CommitmentBreakScreenProps {
  onSetNew: () => void;
  onNotNow: () => void;
}

export function CommitmentBreakScreen({ onSetNew, onNotNow }: CommitmentBreakScreenProps) {
  return (
    <Page>
      <motion.div
        className="flex min-h-full flex-col justify-center gap-qum-lg py-4"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <p className="text-h1 leading-snug text-primary">
          Okay. Honesty is the work. Want to set a new one, or take a beat?
        </p>
        <button
          type="button"
          onClick={onSetNew}
          className="w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
        >
          Set a new commitment
        </button>
        <button
          type="button"
          onClick={onNotNow}
          className="w-full border border-secondary/30 py-3 text-body text-secondary"
        >
          Not right now
        </button>
      </motion.div>
    </Page>
  );
}
