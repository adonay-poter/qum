import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useWaveStore } from '@/stores/waveStore';
import { Phase1Choice } from './Phase1Choice';
import { Phase1Body } from './Phase1Body';
import { Phase1Cold } from './Phase1Cold';
import { Phase1Stillness } from './Phase1Stillness';
import { Phase2Choice } from './Phase2Choice';
import { Phase2Cognitive } from './Phase2Cognitive';
import { Phase2Letter } from './Phase2Letter';
import { Phase2VoiceMemo } from './Phase2VoiceMemo';
import { Phase3Breathing } from './Phase3Breathing';
import { PhaseExitCheck } from './PhaseExitCheck';
import { VictoryScreen } from './VictoryScreen';
import { Page } from '@/components/layout/Page';
import { fadeUp, waveScreen } from '@/lib/motion';

const reducedWaveScreen: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function Phase2Active() {
  const phase2Variant = useWaveStore((s) => s.phase2Variant);
  if (phase2Variant === 'letter') return <Phase2Letter />;
  if (phase2Variant === 'voice_memo') return <Phase2VoiceMemo />;
  return <Phase2Cognitive />;
}

function Phase1Active() {
  const modality = useWaveStore((s) => s.phase1Modality);

  if (modality === 'cold') return <Phase1Cold />;
  if (modality === 'stillness') return <Phase1Stillness />;
  return <Phase1Body />;
}

export function WaveSession() {
  const mode = useWaveStore((s) => s.mode);
  const phase1Modality = useWaveStore((s) => s.phase1Modality);
  const phase2Variant = useWaveStore((s) => s.phase2Variant);
  const reduceMotion = useReducedMotion();
  const screenVariants = reduceMotion ? reducedWaveScreen : waveScreen;
  const phaseVariants = reduceMotion ? reducedWaveScreen : fadeUp;

  if (mode === 'VICTORY') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="victory"
          className="h-full"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <VictoryScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <Page session>
      <motion.div className="flex min-h-full flex-col py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={
              mode === 'PHASE_1'
                ? `phase1-${phase1Modality ?? 'body'}`
                : mode === 'PHASE_2'
                  ? `phase2-${phase2Variant ?? 'cognitive'}`
                  : mode === 'PHASE_EXIT_CHECK'
                    ? 'phase-exit-check'
                    : mode
            }
            className="flex flex-1 flex-col gap-6"
            variants={phaseVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {mode === 'PHASE_1_CHOICE' && <Phase1Choice />}
            {mode === 'PHASE_1' && <Phase1Active />}
            {mode === 'PHASE_2_CHOICE' && <Phase2Choice />}
            {mode === 'PHASE_2' && <Phase2Active />}
            {mode === 'PHASE_EXIT_CHECK' && <PhaseExitCheck />}
            {mode === 'PHASE_3' && <Phase3Breathing />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </Page>
  );
}
