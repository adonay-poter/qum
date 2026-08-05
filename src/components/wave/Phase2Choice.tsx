import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { useWaveStore } from '@/stores/waveStore';
import { useLetterStore } from '@/stores/letterStore';
import { useProfileStore } from '@/stores/profileStore';
import { formatRelativeTime } from '@/lib/dates/formatRelativeTime';
import {
  getPhase2Availability,
  type Phase2ChoiceOption,
} from '@/lib/phase2/phase2Availability';

type CardConfig = {
  option: Phase2ChoiceOption;
  title: string;
  enabled: boolean;
  subtitle: string;
  disabledHint: string;
  icon: ReactNode;
};

export function Phase2Choice() {
  const selectPhase2Choice = useWaveStore((s) => s.selectPhase2Choice);
  const lastPhase2Choice = useWaveStore((s) => s.lastCompletedPhase2Choice);
  const letter = useLetterStore((s) => s.letter);
  const profile = useProfileStore((s) => s.profile);
  const reduceMotion = useReducedMotion();

  const availability = getPhase2Availability(letter, profile);
  const letterTime = letter?.updated_at ?? letter?.created_at;
  const voiceTime = profile?.voice_memo_recorded_at;

  const cards: CardConfig[] = [
    {
      option: 'letter',
      title: 'Read what you wrote yourself',
      enabled: availability.letter,
      subtitle: letterTime
        ? `Letter from ${formatRelativeTime(letterTime)}.`
        : 'Letter from you.',
      disabledHint: 'Write a letter from Home to unlock this.',
      icon: <LetterIcon />,
    },
    {
      option: 'voice',
      title: 'Hear yourself',
      enabled: availability.voice,
      subtitle: voiceTime
        ? `Recording from ${formatRelativeTime(voiceTime)}.`
        : 'Your saved recording.',
      disabledHint: 'Record a voice memo from Home to unlock this.',
      icon: <VoiceIcon />,
    },
    {
      option: 'cognitive',
      title: 'Think it through',
      enabled: true,
      subtitle: 'A cognitive task — camera or text.',
      disabledHint: '',
      icon: <CognitiveIcon />,
    },
  ];

  const showJustUsedBadge =
    availability.enabledCount > 1 && lastPhase2Choice !== null;

  return (
    <section className="flex min-h-full flex-col">
      <p className="text-label uppercase text-tertiary">Phase 2</p>
      <h2 className="mt-qum-sm text-h1 text-primary">Choose the deeper anchor.</h2>
      <p className="mt-qum-sm text-body text-secondary">
        Pick one path for this part of the wave.
      </p>

      <ul className="mt-qum-lg flex flex-1 flex-col gap-3">
        {cards.map((card, index) => {
          const justUsed = showJustUsedBadge && lastPhase2Choice === card.option;
          return (
            <motion.li
              key={card.option}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: index * 0.06, duration: 0.3 }}
            >
              <button
                type="button"
                disabled={!card.enabled}
                onClick={() => {
                  haptic.medium();
                  selectPhase2Choice(card.option);
                }}
                className={`relative flex w-full items-start gap-4 border p-4 text-left transition-colors ${
                  card.enabled
                    ? 'border-secondary/40 bg-surface active:border-tertiary active:bg-tertiary/5'
                    : 'cursor-not-allowed border-secondary/20 bg-surface/60 opacity-50'
                }`}
              >
                {justUsed && (
                  <span className="absolute right-3 top-3 border border-secondary/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-secondary">
                    Just used
                  </span>
                )}
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center border ${
                    card.enabled
                      ? 'border-tertiary/40 bg-tertiary/10 text-tertiary'
                      : 'border-secondary/30 bg-surface text-secondary'
                  }`}
                  aria-hidden
                >
                  {card.icon}
                </span>
                <span className="min-w-0 flex-1 pr-16">
                  <span className="text-label uppercase text-tertiary">{card.title}</span>
                  <span className="mt-1 block text-body text-primary">
                    {card.enabled ? card.subtitle : card.disabledHint}
                  </span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function LetterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16v12H4z" strokeLinejoin="round" />
      <path d="M4 8l8 5 8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function CognitiveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        strokeLinecap="round"
      />
    </svg>
  );
}
