import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import {
  EXIT_CHECK_BREATH_IN_SEC,
  EXIT_CHECK_BREATH_OUT_SEC,
  EXIT_CHECK_PAUSE_SEC,
} from '@/config/waveTiming';

type Step = 'pause' | 'rating' | 'wrap_up' | 'breath';

export function PhaseExitCheck() {
  const submitExitCheckRating = useWaveStore((s) => s.submitExitCheckRating);
  const completeEarlyExit = useWaveStore((s) => s.completeEarlyExit);
  const isCompleting = useWaveStore((s) => s.isCompleting);
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<Step>('pause');
  const [pauseRemaining, setPauseRemaining] = useState(EXIT_CHECK_PAUSE_SEC);
  const [rating, setRating] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'done'>('inhale');

  useEffect(() => {
    if (step !== 'pause') return;
    if (pauseRemaining <= 0) return;

    const id = window.setInterval(() => {
      setPauseRemaining((n) => {
        if (n <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return n - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [step, pauseRemaining]);

  useEffect(() => {
    if (step !== 'breath' || breathPhase === 'done') return;

    const durationMs =
      breathPhase === 'inhale'
        ? EXIT_CHECK_BREATH_IN_SEC * 1000
        : EXIT_CHECK_BREATH_OUT_SEC * 1000;

    const id = window.setTimeout(() => {
      if (breathPhase === 'inhale') setBreathPhase('exhale');
      else setBreathPhase('done');
    }, durationMs);

    return () => window.clearTimeout(id);
  }, [step, breathPhase]);

  const handleRatingSubmit = () => {
    setRatingSubmitted(true);
    if (rating <= 3) haptic.success();
    const next = submitExitCheckRating(rating);
    if (next === 'return_phase2') return;
    setStep('wrap_up');
  };

  const handleFinish = () => {
    void completeEarlyExit(rating);
  };

  if (step === 'pause') {
    return (
      <section className="flex min-h-full flex-col justify-center px-2 py-6">
        <p className="text-h1 leading-snug text-primary">
          Take {EXIT_CHECK_PAUSE_SEC} seconds. Is the urge gone, or just quieter?
        </p>
        {pauseRemaining > 0 ? (
          <p className="mt-qum-lg text-display tabular-nums text-secondary">{pauseRemaining}</p>
        ) : (
          <button
            type="button"
            onClick={() => setStep('rating')}
            className="mt-qum-lg w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
          >
            Continue
          </button>
        )}
      </section>
    );
  }

  if (step === 'rating') {
    return (
      <section className="flex min-h-full flex-col justify-center px-2 py-6">
        <p className="text-h1 leading-snug text-primary">
          On a scale of 0 to 10, where is the urge right now?
        </p>
        <div className="mt-qum-lg">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={rating}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (next !== rating) haptic.select();
              setRating(next);
            }}
            disabled={ratingSubmitted}
            className="w-full accent-tertiary"
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={rating}
            aria-label="Urge intensity"
          />
          <p className="mt-2 text-center text-display tabular-nums text-primary">{rating}</p>
        </div>
        {!ratingSubmitted && (
          <button
            type="button"
            onClick={handleRatingSubmit}
            className="mt-qum-lg w-full border border-secondary/40 py-3 text-body text-primary"
          >
            Submit
          </button>
        )}
      </section>
    );
  }

  if (step === 'wrap_up') {
    return (
      <section className="flex min-h-full flex-col justify-center px-2 py-6">
        <p className="text-h1 leading-snug text-primary">
          The wave feels quiet. Close it with one full breath.
        </p>
        <button
          type="button"
          onClick={() => setStep('breath')}
          className="mt-qum-lg w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
        >
          Continue
        </button>
      </section>
    );
  }

  const breathLabel =
    breathPhase === 'inhale'
      ? 'Breathe in…'
      : breathPhase === 'exhale'
        ? 'Breathe out…'
        : 'Tap to finish';

  return (
    <section className="flex min-h-full flex-col items-center justify-center px-2 py-6">
      <p className="text-h1 text-center leading-snug text-primary">
        Take one full breath. Then tap to finish.
      </p>

      <motion.div
        className="mt-qum-xl flex h-28 w-28 items-center justify-center rounded-full border-2 border-tertiary/50"
        animate={{
          scale: reduceMotion
            ? 1
            : breathPhase === 'inhale'
              ? 1.12
              : breathPhase === 'exhale'
                ? 0.88
                : 1,
        }}
        transition={{
          duration: reduceMotion
            ? 0
            : breathPhase === 'done'
              ? 0.3
              : breathPhase === 'inhale'
                ? EXIT_CHECK_BREATH_IN_SEC
                : EXIT_CHECK_BREATH_OUT_SEC,
          ease: 'easeInOut',
        }}
        aria-hidden
      />

      <p className="mt-qum-md text-body text-secondary">{breathLabel}</p>

      <button
        type="button"
        disabled={breathPhase !== 'done' || isCompleting}
        onClick={handleFinish}
        className="mt-qum-lg w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCompleting ? 'Finishing…' : 'Tap to finish'}
      </button>
    </section>
  );
}
