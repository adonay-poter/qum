import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { PHASE_1_END_SEC } from '@/types/database';
import { parseTaskStepData } from '@/types/taskSteps';
import { stillnessSkipUnlockSec } from '@/lib/wave/stillnessStepSkip';
import { trackEvent } from '@/services/telemetryService';

export function Phase1Stillness() {
  const task = useWaveStore((s) => s.phase1Task);
  const completePhase1 = useWaveStore((s) => s.completePhase1);
  const elapsedSec = useWaveStore((s) => s.elapsedSec);
  const phase1Cleared = useWaveStore((s) => s.phase1Cleared);
  const { phase1Remaining } = useWaveTimer();

  const stepData = useMemo(() => parseTaskStepData(task?.step_data), [task?.step_data]);
  const isMultiStep = stepData != null;
  const singleDuration = task?.duration_sec ?? 90;

  const [stepIndex, setStepIndex] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [singleElapsed, setSingleElapsed] = useState(0);
  const stepAdvancedRef = useRef(false);

  const steps = stepData?.steps ?? [];
  const currentStep = isMultiStep ? steps[stepIndex] : null;
  const stepDuration = currentStep?.duration_sec ?? 0;

  const advanceStep = useCallback(
    (viaSkip?: boolean) => {
      if (!isMultiStep) return;
      if (viaSkip && stepDuration > 0) {
        const percentElapsed = Math.min(100, Math.round((stepElapsed / stepDuration) * 100));
        trackEvent('stillness_step_skipped', {
          step_index: stepIndex,
          percent_elapsed: percentElapsed,
        });
      }
      if (stepIndex >= steps.length - 1) {
        completePhase1();
        return;
      }
      stepAdvancedRef.current = false;
      setStepIndex((i) => i + 1);
      setStepElapsed(0);
    },
    [isMultiStep, stepIndex, steps.length, stepDuration, stepElapsed, completePhase1],
  );

  useEffect(() => {
    if (phase1Cleared) return;

    if (isMultiStep && currentStep) {
      const id = window.setInterval(() => setStepElapsed((n) => n + 1), 1000);
      return () => window.clearInterval(id);
    }

    const id = window.setInterval(() => setSingleElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase1Cleared, isMultiStep, currentStep, stepIndex]);

  useEffect(() => {
    if (phase1Cleared || !isMultiStep || !currentStep || stepAdvancedRef.current) return;
    if (stepElapsed >= stepDuration) {
      stepAdvancedRef.current = true;
      advanceStep();
    }
  }, [stepElapsed, stepDuration, currentStep, isMultiStep, phase1Cleared, advanceStep]);

  useEffect(() => {
    if (phase1Cleared || isMultiStep) return;
    if (singleElapsed >= singleDuration) {
      completePhase1();
    }
  }, [singleElapsed, singleDuration, isMultiStep, phase1Cleared, completePhase1]);

  useEffect(() => {
    if (phase1Cleared) return;
    if (elapsedSec >= PHASE_1_END_SEC) {
      completePhase1();
    }
  }, [elapsedSec, phase1Cleared, completePhase1]);

  if (!task) {
    return <p className="text-body text-secondary">Loading mindful task…</p>;
  }

  const phaseMins = Math.floor(phase1Remaining / 60);
  const phaseSecs = phase1Remaining % 60;
  const displayTitle = task.title ?? 'Stillness practice';
  const displayDescription = task.description ?? task.prompt_text;

  if (isMultiStep && currentStep) {
    const skipUnlockAt = stillnessSkipUnlockSec(stepDuration);
    const canSkip = stepElapsed >= skipUnlockAt;

    return (
      <section className="flex flex-col">
        <p className="text-label uppercase text-tertiary">Phase 1 — Stillness</p>
        <h2 className="mt-qum-sm text-h1 text-primary">{displayTitle}</h2>
        <p className="mt-qum-sm text-body text-secondary">{displayDescription}</p>
        <p className="mt-2 text-body text-secondary" aria-live="polite">
          Step {stepIndex + 1} of {steps.length} · Phase {phaseMins}:
          {phaseSecs.toString().padStart(2, '0')}
        </p>

        <h3 className="mt-qum-md text-h1 text-primary">{currentStep.prompt}</h3>

        <button
          type="button"
          disabled={!canSkip}
          onClick={() => {
            stepAdvancedRef.current = true;
            advanceStep(true);
          }}
          className="mt-qum-lg w-full border-2 py-4 text-body font-semibold disabled:cursor-not-allowed disabled:border-secondary/25 disabled:bg-transparent disabled:text-secondary/45 border-tertiary bg-tertiary/10 text-primary"
        >
          Next
        </button>
      </section>
    );
  }

  const remaining = Math.max(0, singleDuration - singleElapsed);

  return (
    <section className="flex flex-col">
      <p className="text-label uppercase text-tertiary">Phase 1 — Stillness</p>
      <h2 className="mt-qum-sm text-h1 text-primary">{displayTitle}</h2>
      <p className="mt-qum-sm text-body text-secondary">{displayDescription}</p>
      <p className="mt-2 text-body text-secondary">
        Phase {phaseMins}:{phaseSecs.toString().padStart(2, '0')}
      </p>

      <p className="mt-qum-lg text-h1 leading-snug text-primary">{task.prompt_text}</p>

      <p
        className="mt-qum-md text-display tabular-nums text-secondary"
        aria-live="polite"
        aria-atomic="true"
      >
        {remaining}s remaining
      </p>
    </section>
  );
}
