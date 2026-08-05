import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import type { Phase1Modality } from '@/types/wave';

const OPTIONS: {
  modality: Phase1Modality;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    modality: 'body',
    title: 'Body',
    description: 'Move with effort. Pushups, squats, or jumping jacks.',
    icon: <BodyIcon />,
  },
  {
    modality: 'cold',
    title: 'Cold',
    description: 'Cold water on your face, neck, or wrists.',
    icon: <ColdIcon />,
  },
  {
    modality: 'stillness',
    title: 'Stillness',
    description: 'Ground in your senses. Stay with each cue.',
    icon: <StillnessIcon />,
  },
];

export function Phase1Choice() {
  const selectPhase1Modality = useWaveStore((s) => s.selectPhase1Modality);
  const reduceMotion = useReducedMotion();

  return (
    <section className="flex min-h-full flex-col">
      <p className="text-label uppercase text-tertiary">Phase 1</p>
      <h2 className="mt-qum-sm text-h1 text-primary">Choose your first anchor.</h2>
      <p className="mt-qum-sm text-body text-secondary">One path. Stay with it.</p>

      <ul className="mt-qum-lg flex flex-1 flex-col gap-3">
        {OPTIONS.map((opt, index) => (
          <motion.li
            key={opt.modality}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { delay: index * 0.06, duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => {
                haptic.medium();
                selectPhase1Modality(opt.modality);
              }}
              className="flex w-full items-start gap-4 border border-secondary/40 bg-surface p-4 text-left transition-colors active:border-tertiary active:bg-tertiary/5"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-tertiary/40 bg-tertiary/10 text-tertiary"
                aria-hidden
              >
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-label uppercase text-tertiary">{opt.title}</span>
                <span className="mt-1 block text-body text-primary">{opt.description}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function BodyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v5M9 11l-3 6M15 11l3 6M12 12v5" strokeLinecap="round" />
    </svg>
  );
}

function ColdIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StillnessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  );
}
