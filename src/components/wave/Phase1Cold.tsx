import { useEffect, useState } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { PHASE_1_END_SEC } from '@/types/database';

export function Phase1Cold() {
  const task = useWaveStore((s) => s.phase1Task);
  const completePhase1 = useWaveStore((s) => s.completePhase1);
  const elapsedSec = useWaveStore((s) => s.elapsedSec);
  const phase1Cleared = useWaveStore((s) => s.phase1Cleared);
  const { phase1Remaining } = useWaveTimer();

  const durationSec = task?.duration_sec ?? 90;

  const [running, setRunning] = useState(false);
  const [coldElapsed, setColdElapsed] = useState(0);

  useEffect(() => {
    if (!running || phase1Cleared) return;

    const id = window.setInterval(() => {
      setColdElapsed((n) => n + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [running, phase1Cleared]);

  useEffect(() => {
    if (phase1Cleared) return;

    if (coldElapsed >= durationSec || elapsedSec >= PHASE_1_END_SEC) {
      completePhase1();
    }
  }, [coldElapsed, durationSec, elapsedSec, phase1Cleared, completePhase1]);

  if (!task) {
    return <p className="text-body text-secondary">Loading cold task…</p>;
  }

  const remaining = Math.max(0, durationSec - coldElapsed);
  const progress = running ? coldElapsed / durationSec : 0;
  const ringArc = progress * 276;

  const phaseMins = Math.floor(phase1Remaining / 60);
  const phaseSecs = phase1Remaining % 60;

  const displayTitle = task.title ?? 'Cold exposure';
  const displayDescription = task.description ?? task.prompt_text;

  return (
    <section className="flex flex-col items-center text-center">
      <p className="text-label uppercase text-tertiary">Phase 1 — Cold</p>
      <h2 className="mt-qum-sm max-w-sm text-h1 text-primary">{displayTitle}</h2>
      <p className="mt-qum-sm text-body text-secondary">{displayDescription}</p>
      {task.safety_note && (
        <p className="mt-qum-sm max-w-sm text-[0.75rem] leading-relaxed text-secondary/80">
          {task.safety_note}
        </p>
      )}
      <p className="mt-2 text-body text-secondary">
        Phase window {phaseMins}:{phaseSecs.toString().padStart(2, '0')}
      </p>

      <ColdCountdownRing ringArc={ringArc} remaining={remaining} running={running} total={durationSec} />

      {!running ? (
        <button
          type="button"
          onClick={() => setRunning(true)}
          className="mt-qum-lg w-full max-w-sm border-2 border-tertiary bg-tertiary/10 py-4 text-body font-semibold text-primary"
        >
          I&apos;m doing it
        </button>
      ) : (
        <p className="mt-qum-md text-body text-secondary">
          Stay with the cold — {remaining}s left
        </p>
      )}
    </section>
  );
}

function ColdCountdownRing({
  ringArc,
  remaining,
  running,
  total,
}: {
  ringArc: number;
  remaining: number;
  running: boolean;
  total: number;
}) {
  return (
    <div className="relative mt-qum-lg flex h-44 w-44 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-secondary/25"
        />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={`${ringArc} 276`}
          className="text-tertiary transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="relative z-10 text-center">
        <p className="text-display font-bold tabular-nums text-primary">
          {running ? remaining : total}
        </p>
        <p className="mt-1 text-label uppercase text-secondary">seconds</p>
      </div>
    </div>
  );
}
