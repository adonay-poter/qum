import { useMemo } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import {
  BREATHING_DURATION_SEC,
  PHASE_1_END_SEC,
  PHASE_2_END_SEC,
  WAVE_DURATION_SEC,
} from '@/types/database';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function useWaveTimer() {
  const elapsedSec = useWaveStore((s) => s.elapsedSec);
  const mode = useWaveStore((s) => s.mode);
  const breathingElapsedSec = useWaveStore((s) => s.breathingElapsedSec);

  return useMemo(() => {
    const remainingGlobal = Math.max(0, WAVE_DURATION_SEC - elapsedSec);

    const phase1Remaining = Math.max(0, PHASE_1_END_SEC - elapsedSec);
    const phase2Remaining = Math.max(0, PHASE_2_END_SEC - elapsedSec);
    const breathingRemaining = Math.max(0, BREATHING_DURATION_SEC - breathingElapsedSec);
    const phase3Remaining = breathingRemaining;

    const activeRemaining = mode === 'PHASE_3' ? breathingRemaining : remainingGlobal;
    const activeProgress =
      mode === 'PHASE_3'
        ? breathingElapsedSec / BREATHING_DURATION_SEC
        : elapsedSec / WAVE_DURATION_SEC;

    const phaseProgress =
      mode === 'PHASE_1_CHOICE'
        ? elapsedSec / PHASE_1_END_SEC
        : mode === 'PHASE_1'
          ? elapsedSec / PHASE_1_END_SEC
          : mode === 'PHASE_2_CHOICE'
            ? Math.max(0, elapsedSec - PHASE_1_END_SEC) /
              (PHASE_2_END_SEC - PHASE_1_END_SEC)
          : mode === 'PHASE_2'
            ? (elapsedSec - PHASE_1_END_SEC) / (PHASE_2_END_SEC - PHASE_1_END_SEC)
          : mode === 'PHASE_3'
              ? breathingElapsedSec / BREATHING_DURATION_SEC
              : 0;

    const finishedEarly =
      mode === 'PHASE_3' && elapsedSec < PHASE_2_END_SEC;

    return {
      elapsedSec,
      remainingGlobal,
      remainingGlobalLabel: formatTime(remainingGlobal),
      activeRemaining,
      activeRemainingLabel: formatTime(activeRemaining),
      activeProgress: clampProgress(activeProgress),
      phase1Remaining,
      phase2Remaining,
      phase3Remaining,
      breathingRemaining,
      breathingRemainingLabel: formatTime(breathingRemaining),
      phaseProgress: clampProgress(phaseProgress),
      finishedEarly,
    };
  }, [elapsedSec, mode, breathingElapsedSec]);
}
