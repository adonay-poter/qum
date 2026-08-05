import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { pulsar } from '@/lib/pulsar';
import { useWaveStore } from '@/stores/waveStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { BREATHING_DURATION_SEC, BOX_CYCLES } from '@/types/database';
import {
  BREATH_HINTS,
  BREATH_LABELS,
  getBreathPhase,
} from '@/lib/breathing/boxBreathing';

const PHASE_DOTS: { key: string; label: string }[] = [
  { key: 'inhale', label: 'In' },
  { key: 'hold_in', label: 'Hold' },
  { key: 'exhale', label: 'Out' },
  { key: 'hold_out', label: 'Hold' },
];

export function Phase3Breathing() {
  const breathingElapsedSec = useWaveStore((s) => s.breathingElapsedSec);
  const breathingComplete = useWaveStore((s) => s.breathingComplete);
  const { finishedEarly } = useWaveTimer();
  const reduceMotion = useReducedMotion();

  const breath = useMemo(
    () => getBreathPhase(breathingElapsedSec),
    [breathingElapsedSec],
  );

  const prevPhaseRef = useRef<string | null>(null);
  const successHapticRef = useRef(false);

  useEffect(() => {
    if (breathingComplete) {
      if (!successHapticRef.current) {
        successHapticRef.current = true;
        void pulsar.playPreset('success');
      }
      return;
    }

    const phase = breath.phase;
    if (prevPhaseRef.current !== phase) {
      // Trigger a clean bassDrop preset cue on each breathing transition
      void pulsar.playPreset('bassDrop');
    }
    prevPhaseRef.current = phase;
  }, [breath.phase, breathingComplete]);

  // Clean up continuous vibrations when step shifts or component unmounts
  useEffect(() => {
    return () => {
      void pulsar.stopActiveWave();
    };
  }, []);

  const cyclesDone = Math.min(BOX_CYCLES, breath.cycleIndex + 1);
  const totalRemaining = Math.max(0, BREATHING_DURATION_SEC - breathingElapsedSec);

  return (
    <section className="flex flex-col items-center text-center">
      <p className="text-label uppercase text-tertiary">Phase 3 — Cooldown</p>
      <h2 className="mt-qum-sm text-h1 text-primary">Box breathing</h2>

      {finishedEarly && (
        <p className="mt-qum-sm max-w-sm text-body text-primary">
          You cleared the work early. One focused cooldown, then you close the wave.
        </p>
      )}

      <p className="mt-qum-sm max-w-xs text-body text-secondary">
        4·4·4·4 pattern · Cycle {cyclesDone}/{BOX_CYCLES} · {totalRemaining}s left
      </p>

      {/* Orb only — rings + scaling core, nothing on top */}
      <div className="relative mt-qum-lg flex h-52 w-52 items-center justify-center">
        <span className="absolute inset-0 border border-secondary/25" aria-hidden />
        <span className="absolute inset-6 border border-tertiary/25" aria-hidden />

        <div
          className="relative z-10 flex h-40 w-40 items-center justify-center border-2 border-tertiary bg-tertiary/15 transition-transform duration-[900ms] ease-in-out motion-reduce:transition-none"
          style={{ transform: `scale(${reduceMotion ? 1 : breath.scale})` }}
        >
          <div className="text-center">
            <p className="text-label uppercase text-tertiary">
              {breathingComplete ? 'Complete' : BREATH_LABELS[breath.phase]}
            </p>
            <p className="mt-1 text-display font-bold tabular-nums text-primary">
              {breathingComplete ? '✓' : breath.phaseRemaining}
            </p>
          </div>
        </div>
      </div>

      {/* Phase steps sit below the orb, not over it */}
      <div
        className="mt-qum-md flex w-full max-w-xs gap-1"
        role="list"
        aria-label="Breath phases"
      >
        {PHASE_DOTS.map((dot) => {
          const active = breath.phase === dot.key;
          return (
            <div
              key={dot.key}
              role="listitem"
              aria-current={active ? 'step' : undefined}
              className={`flex flex-1 items-center justify-center border py-2 text-[0.55rem] uppercase tracking-widest transition-colors duration-300 motion-reduce:transition-none ${
                active
                  ? 'border-tertiary bg-tertiary text-on-primary'
                  : 'border-secondary/30 bg-surface text-secondary'
              }`}
            >
              {dot.label}
            </div>
          );
        })}
      </div>

      <p className="mt-qum-md min-h-[2.5rem] max-w-xs text-body text-secondary">
        {breathingComplete ? 'Wave stabilizing…' : BREATH_HINTS[breath.phase]}
      </p>

      <div className="mt-qum-sm flex w-full max-w-xs gap-1">
        {Array.from({ length: BOX_CYCLES }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 transition-colors duration-500 motion-reduce:transition-none ${
              i < breath.cycleIndex || breathingComplete
                ? 'bg-tertiary'
                : i === breath.cycleIndex
                  ? 'bg-tertiary/50'
                  : 'bg-surface'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
