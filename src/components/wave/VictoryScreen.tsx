import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import { useProfileStore } from '@/stores/profileStore';
import { useLetterStore } from '@/stores/letterStore';
import { useCountUp } from '@/hooks/useCountUp';
import { clampResilience } from '@/lib/profileStats';
import { getCachedMemoPlayback } from '@/services/voiceMemoService';
import { trackEvent } from '@/services/telemetryService';
import { haptic } from '@/lib/haptics';
import {
  getAvailableVictoryArtifacts,
  pickVictoryArtifact,
  type VictoryArtifactType,
} from '@/lib/victory/pickVictoryArtifact';

const LETTER_PREVIEW_CHARS = 200;

function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const sec = Math.max(1, Math.round(ms / 1000));
  return `${sec}s`;
}

export function VictoryScreen() {
  const resetToIdle = useWaveStore((s) => s.resetToIdle);
  const userId = useWaveStore((s) => s.userId);
  const resilienceAtStart = useWaveStore((s) => s.resilienceAtStart);
  const resilienceGainDelta = useWaveStore((s) => s.resilienceGainDelta);
  const commitmentAtWaveStart = useWaveStore((s) => s.commitmentAtWaveStart);
  const profile = useProfileStore((s) => s.profile);
  const letter = useLetterStore((s) => s.letter);

  const [show, setShow] = useState(false);
  const [letterExpanded, setLetterExpanded] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDurationMs, setVoiceDurationMs] = useState<number | null>(null);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const voiceObjectUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasLetter = Boolean(letter?.body?.trim());
  const hasVoiceMemo = Boolean(profile?.voice_memo_path);
  const hadCommitment = Boolean(commitmentAtWaveStart);

  const artifact = useMemo(() => {
    const available = getAvailableVictoryArtifacts({
      hasPledge: false,
      hasLetter,
      hasVoiceMemo,
    });
    return pickVictoryArtifact(available);
  }, [hasLetter, hasVoiceMemo]);

  const victoryHapticRef = useRef(false);
  useEffect(() => {
    if (victoryHapticRef.current) return;
    victoryHapticRef.current = true;
    haptic.success();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void useProfileStore.getState().loadProfile(userId, { force: true });
    void useLetterStore.getState().load(userId);
  }, [userId]);

  useEffect(() => {
    if (!artifact) return;
    trackEvent('victory_artifact_shown', { artifact_type: artifact });
  }, [artifact]);

  useEffect(() => {
    if (artifact !== 'voice_memo' || !userId) return;

    let cancelled = false;
    void (async () => {
      const playback = await getCachedMemoPlayback(userId);
      if (cancelled || !playback) return;
      voiceObjectUrlRef.current = playback.objectUrl;
      setVoiceUrl(playback.objectUrl);
      setVoiceDurationMs(playback.durationMs);
    })();

    return () => {
      cancelled = true;
      if (voiceObjectUrlRef.current) {
        URL.revokeObjectURL(voiceObjectUrlRef.current);
        voiceObjectUrlRef.current = null;
      }
    };
  }, [artifact, userId]);

  const xpGain = 50;
  const resilienceGain =
    resilienceGainDelta ?? (profile ? profile.resilience_level - resilienceAtStart : 0);
  const animatedXp = useCountUp(xpGain, 1400, show);
  const currentResilience = clampResilience(profile?.resilience_level ?? resilienceAtStart);
  const gainLabel =
    resilienceGain > 0
      ? `+${resilienceGain}`
      : resilienceGain < 0
        ? `${resilienceGain}`
        : '±0';

  const letterBody = letter?.body?.trim() ?? '';
  const letterPreview =
    letterBody.length > LETTER_PREVIEW_CHARS && !letterExpanded
      ? `${letterBody.slice(0, LETTER_PREVIEW_CHARS).trimEnd()}…`
      : letterBody;

  const handleVoicePlay = () => {
    if (!audioRef.current || !voiceUrl) return;
    if (voicePlaying) {
      audioRef.current.pause();
      setVoicePlaying(false);
      return;
    }
    void audioRef.current.play();
    setVoicePlaying(true);
  };

  return (
    <section className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-4 text-center">
      <div
        className={`w-full max-w-md border border-secondary/30 bg-surface p-qum-lg transition-opacity duration-500 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {hadCommitment && commitmentAtWaveStart && (
          <div className="mb-qum-md text-left">
            <p className="text-body leading-relaxed text-primary">
              You had a commitment running. You surfed the wave instead. That&apos;s the
              point.
            </p>
            <blockquote className="mt-qum-sm border-l-2 border-tertiary/50 pl-3">
              <p className="whitespace-pre-wrap text-body italic text-secondary">
                &ldquo;{commitmentAtWaveStart.pledge}&rdquo;
              </p>
            </blockquote>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="border border-tertiary/40 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-tertiary">
            +{animatedXp} XP
          </span>
          <span className="border border-secondary/30 px-2 py-1 text-[0.65rem] uppercase tracking-wider text-secondary">
            Shield {currentResilience} ({gainLabel})
          </span>
        </div>

        <p className="mt-qum-md text-label uppercase text-tertiary">Wave cleared</p>

        <ArtifactHeadline
          artifact={artifact}
          letterPreview={letterPreview}
          letterExpanded={letterExpanded}
          letterBody={letterBody}
          onExpandLetter={() => setLetterExpanded(true)}
          voiceUrl={voiceUrl}
          voiceDurationMs={voiceDurationMs}
          voicePlaying={voicePlaying}
          onVoicePlay={handleVoicePlay}
          audioRef={audioRef}
          onVoiceEnded={() => setVoicePlaying(false)}
        />

        <button
          type="button"
          onClick={resetToIdle}
          className="mt-qum-lg w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
        >
          Return home
        </button>
      </div>

      <div className="pointer-events-none mt-qum-lg flex gap-2" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-victory-pop bg-tertiary"
            style={{ animationDelay: `${0.35 + i * 0.08}s` }}
          />
        ))}
      </div>
    </section>
  );
}

function ArtifactHeadline({
  artifact,
  letterPreview,
  letterExpanded,
  letterBody,
  onExpandLetter,
  voiceUrl,
  voiceDurationMs,
  voicePlaying,
  onVoicePlay,
  audioRef,
  onVoiceEnded,
}: {
  artifact: VictoryArtifactType | null;
  letterPreview: string;
  letterExpanded: boolean;
  letterBody: string;
  onExpandLetter: () => void;
  voiceUrl: string | null;
  voiceDurationMs: number | null;
  voicePlaying: boolean;
  onVoicePlay: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  onVoiceEnded: () => void;
}) {
  if (!artifact) {
    return (
      <h2 className="mt-qum-sm animate-victory-rise text-display text-primary">
        You surfed it.
      </h2>
    );
  }

  if (artifact === 'letter' && letterBody) {
    return (
      <blockquote className="mt-qum-md text-left">
        <p className="text-label uppercase text-secondary">From past you</p>
        <p className="mt-qum-sm whitespace-pre-wrap text-body leading-relaxed text-primary">
          {letterPreview}
        </p>
        {!letterExpanded && letterBody.length > LETTER_PREVIEW_CHARS && (
          <button
            type="button"
            onClick={onExpandLetter}
            className="mt-3 text-label uppercase text-tertiary"
          >
            Read full letter
          </button>
        )}
      </blockquote>
    );
  }

  if (artifact === 'voice_memo') {
    return (
      <div className="mt-qum-md">
        <p className="text-label uppercase text-secondary">Why this matters</p>
        <p className="mt-qum-sm text-h1 text-primary">Your voice memo</p>
        {voiceUrl && (
          <audio ref={audioRef} src={voiceUrl} className="sr-only" onEnded={onVoiceEnded} />
        )}
        <button
          type="button"
          disabled={!voiceUrl}
          onClick={onVoicePlay}
          className="mt-qum-md w-full border border-tertiary/50 py-4 text-body font-semibold text-primary disabled:opacity-40"
        >
          {voicePlaying ? 'Playing…' : 'Play'} · {formatDuration(voiceDurationMs)}
        </button>
      </div>
    );
  }

  return (
    <h2 className="mt-qum-sm animate-victory-rise text-display text-primary">
      You surfed it.
    </h2>
  );
}
