import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import { useLetterStore } from '@/stores/letterStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { formatRelativeTime } from '@/lib/dates/formatRelativeTime';
import { PHASE_1_END_SEC } from '@/types/database';
import { UrgePassedLink } from './UrgePassedLink';

const READ_SECONDS = 8;

export function Phase2Letter() {
  const letter = useLetterStore((s) => s.letter);
  const submitPhase2Proof = useWaveStore((s) => s.submitPhase2Proof);
  const { phase2Remaining, elapsedSec } = useWaveTimer();
  const [readElapsed, setReadElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setReadElapsed((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const canConfirm = readElapsed >= READ_SECONDS;
  const readGateHapticRef = useRef(false);

  useEffect(() => {
    if (canConfirm && !readGateHapticRef.current) {
      readGateHapticRef.current = true;
      haptic.light();
    }
  }, [canConfirm]);

  const aheadOfSchedule = elapsedSec < PHASE_1_END_SEC + 90;
  const phaseMins = Math.floor(phase2Remaining / 60);
  const phaseSecs = phase2Remaining % 60;

  if (!letter?.body) {
    return <p className="text-body text-secondary">Loading your letter…</p>;
  }

  const writtenRelative = formatRelativeTime(letter.updated_at || letter.created_at);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <p className="text-label uppercase text-tertiary">Phase 2 — From past you</p>
      <p className="mt-qum-sm text-body text-secondary">
        From you, {writtenRelative} ago
      </p>

      {aheadOfSchedule && (
        <p className="mt-2 text-body text-primary">
          Ahead of schedule. Take this in, then begin the cooldown.
        </p>
      )}

      <p className="mt-2 text-body text-secondary">
        Phase window up to {phaseMins}:{phaseSecs.toString().padStart(2, '0')}
      </p>

      <blockquote className="mt-qum-lg min-h-0 flex-1 overflow-y-auto border-l-2 border-tertiary/50 py-1 pl-4 pr-1">
        <p className="whitespace-pre-wrap font-mono text-[1.05rem] leading-relaxed text-primary">
          {letter.body}
        </p>
      </blockquote>

      <div className="mt-qum-md shrink-0">
        {!canConfirm && (
          <p className="mb-3 text-center text-body text-secondary">
            Read for {READ_SECONDS - readElapsed}s…
          </p>
        )}
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            haptic.medium();
            submitPhase2Proof();
          }}
          className="w-full border-2 border-tertiary bg-tertiary/10 py-4 text-body font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          I read it
        </button>
        <UrgePassedLink />
      </div>
    </section>
  );
}
