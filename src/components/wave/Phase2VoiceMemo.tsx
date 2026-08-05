import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import { getCachedMemoPlayback } from '@/services/voiceMemoService';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { PHASE_1_END_SEC } from '@/types/database';
import { UrgePassedLink } from './UrgePassedLink';

export function Phase2VoiceMemo() {
  const userId = useWaveStore((s) => s.userId);
  const submitPhase2Proof = useWaveStore((s) => s.submitPhase2Proof);
  const { phase2Remaining, elapsedSec } = useWaveTimer();
  const reduceMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [heardComplete, setHeardComplete] = useState(false);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const heardGateHapticRef = useRef(false);

  useEffect(() => {
    if (heardComplete && !heardGateHapticRef.current) {
      heardGateHapticRef.current = true;
      haptic.light();
    }
  }, [heardComplete]);

  const aheadOfSchedule = elapsedSec < PHASE_1_END_SEC + 90;
  const phaseMins = Math.floor(phase2Remaining / 60);
  const phaseSecs = phase2Remaining % 60;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setLoadError(false);
      const playback = await getCachedMemoPlayback(userId);
      if (cancelled) {
        if (playback?.objectUrl) URL.revokeObjectURL(playback.objectUrl);
        return;
      }
      if (!playback) {
        setLoadError(true);
        setLoading(false);
        return;
      }

      objectUrlRef.current = playback.objectUrl;
      const audio = audioRef.current;
      if (!audio) {
        setLoading(false);
        return;
      }

      audio.src = playback.objectUrl;
      setLoading(false);

      try {
        await audio.play();
      } catch {
        setNeedsTapToPlay(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [userId]);

  const handleEnded = () => setHeardComplete(true);

  if (loadError) {
    return (
      <section className="flex min-h-0 flex-1 flex-col">
        <p className="text-body text-secondary">Could not load your voice memo.</p>
        <button
          type="button"
          onClick={() => submitPhase2Proof()}
          className="mt-auto w-full border border-secondary/40 py-4 text-body text-primary"
        >
          Continue
        </button>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <p className="text-label uppercase text-tertiary">Phase 2 — Your voice</p>
      <h2 className="mt-qum-sm text-h1 text-primary">Listen to yourself.</h2>

      {aheadOfSchedule && (
        <p className="mt-2 text-body text-primary">
          Ahead of schedule. Hear this through, then begin the cooldown.
        </p>
      )}

      <p className="mt-2 text-body text-secondary">
        Phase window up to {phaseMins}:{phaseSecs.toString().padStart(2, '0')}
      </p>

      <div className="mt-qum-lg flex flex-1 flex-col items-center justify-center gap-6">
        {loading ? (
          <p className="text-body text-secondary">Loading your memo…</p>
        ) : (
          <>
            <div
              className="flex h-28 w-full max-w-xs items-end justify-center gap-1"
              aria-hidden
            >
              {Array.from({ length: 16 }, (_, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-tertiary motion-safe:animate-pulse"
                  style={{
                    height: `${30 + ((i * 17) % 70)}%`,
                    animationDelay: reduceMotion ? '0s' : `${i * 0.06}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-body text-secondary" id="voice-memo-playback-label">
              This is your own recording — no captions are available.
            </p>
            <audio
              ref={audioRef}
              className="sr-only"
              aria-labelledby="voice-memo-playback-label"
              onEnded={handleEnded}
              playsInline
            />
            {needsTapToPlay && !heardComplete && (
              <button
                type="button"
                onClick={() => void audioRef.current?.play()}
                aria-label="Play your voice memo"
                className="border border-tertiary/50 px-6 py-3 text-body text-primary"
              >
                Tap to play
              </button>
            )}
            {!heardComplete && (
              <p className="text-center text-body text-secondary">
                Play to the end to continue.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-qum-md shrink-0">
        <button
          type="button"
          disabled={!heardComplete || loading}
          onClick={() => {
            haptic.medium();
            submitPhase2Proof();
          }}
          aria-label="I heard my voice memo"
          className="w-full border-2 border-tertiary bg-tertiary/10 py-4 text-body font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          I heard it
        </button>
        <UrgePassedLink />
      </div>
    </section>
  );
}
