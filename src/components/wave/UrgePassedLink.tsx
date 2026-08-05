import { useEffect, useRef } from 'react';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import { EARLY_EXIT_MIN_SEC } from '@/types/database';

/** Muted exit ramp — Phase 2 only, after 4 minutes of wave time. */
export function UrgePassedLink() {
  const mode = useWaveStore((s) => s.mode);
  const elapsedSec = useWaveStore((s) => s.elapsedSec);
  const startExitCheck = useWaveStore((s) => s.startExitCheck);
  const visible = mode === 'PHASE_2' && elapsedSec >= EARLY_EXIT_MIN_SEC;
  const visibilityHapticRef = useRef(false);

  useEffect(() => {
    if (visible && !visibilityHapticRef.current) {
      visibilityHapticRef.current = true;
      haptic.light();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-qum-md shrink-0 pt-2 text-center">
      <button
        type="button"
        onClick={() => startExitCheck()}
        className="text-[0.68rem] font-normal uppercase tracking-[0.1em] text-secondary/55 underline-offset-2 hover:text-secondary/80 hover:underline"
      >
        The urge passed.
      </button>
    </div>
  );
}
