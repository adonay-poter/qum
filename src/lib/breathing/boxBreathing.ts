import { BOX_PHASE_SEC } from '@/config/waveTiming';

export type BreathPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

export const BREATH_LABELS: Record<BreathPhase, string> = {
  inhale: 'Breathe in',
  hold_in: 'Hold',
  exhale: 'Breathe out',
  hold_out: 'Hold',
};

export const BREATH_HINTS: Record<BreathPhase, string> = {
  inhale: 'Slow through the nose — fill the belly',
  hold_in: 'Steady. Let the urge pass.',
  exhale: 'Long exhale through the mouth',
  hold_out: 'Empty lungs. You are in control.',
};

export function getBreathPhase(elapsedSec: number): {
  phase: BreathPhase;
  phaseElapsed: number;
  phaseRemaining: number;
  cycleIndex: number;
  scale: number;
} {
  const cycleLen = BOX_PHASE_SEC * 4;
  const inCycle = elapsedSec % cycleLen;
  const cycleIndex = Math.floor(elapsedSec / cycleLen);

  let phase: BreathPhase;
  let phaseStart: number;

  if (inCycle < BOX_PHASE_SEC) {
    phase = 'inhale';
    phaseStart = 0;
  } else if (inCycle < BOX_PHASE_SEC * 2) {
    phase = 'hold_in';
    phaseStart = BOX_PHASE_SEC;
  } else if (inCycle < BOX_PHASE_SEC * 3) {
    phase = 'exhale';
    phaseStart = BOX_PHASE_SEC * 2;
  } else {
    phase = 'hold_out';
    phaseStart = BOX_PHASE_SEC * 3;
  }

  const phaseElapsed = inCycle - phaseStart;
  const phaseRemaining = BOX_PHASE_SEC - phaseElapsed;

  const scale =
    phase === 'inhale'
      ? 0.55 + (phaseElapsed / BOX_PHASE_SEC) * 0.45
      : phase === 'hold_in'
        ? 1
        : phase === 'exhale'
          ? 1 - (phaseElapsed / BOX_PHASE_SEC) * 0.45
          : 0.55;

  return { phase, phaseElapsed, phaseRemaining, cycleIndex, scale };
}
