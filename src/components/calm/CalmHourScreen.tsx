import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { useLetterStore } from '@/stores/letterStore';
import { useProfileStore } from '@/stores/profileStore';
import { PatternBreakdownSection } from '@/components/dashboard/PatternBreakdown';
import { usePatternBreakdown } from '@/hooks/usePatternBreakdown';
import { getCachedMemoPlayback } from '@/services/voiceMemoService';
import { insertCalmHourSession } from '@/services/calmHourService';
import { trackEvent } from '@/services/telemetryService';
import { slideX } from '@/lib/motion';

const TOTAL_STEPS = 4;

interface CalmHourScreenProps {
  userId: string;
  onDone: () => void;
  onEditLetter?: () => void;
  onReRecordVoice?: () => void;
}

export function CalmHourScreen({
  userId,
  onDone,
  onEditLetter,
  onReRecordVoice,
}: CalmHourScreenProps) {
  const letter = useLetterStore((s) => s.letter);
  const loadLetter = useLetterStore((s) => s.load);
  const profile = useProfileStore((s) => s.profile);
  const { breakdown, loading: patternsLoading } = usePatternBreakdown(userId, 7);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [reviewedLetter, setReviewedLetter] = useState(false);
  const [reviewedVoiceMemo, setReviewedVoiceMemo] = useState(false);
  const [reviewedPatterns, setReviewedPatterns] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceUrlRef = useRef<string | null>(null);

  const hasLetter = Boolean(letter?.body?.trim());
  const hasVoiceMemo = Boolean(profile?.voice_memo_path);

  useEffect(() => {
    trackEvent('calm_hour_started');
    void loadLetter(userId, { force: true });
  }, [userId, loadLetter]);

  useEffect(() => {
    if (step !== 2 || !hasVoiceMemo) return;

    let cancelled = false;
    setVoiceLoading(true);
    void (async () => {
      const playback = await getCachedMemoPlayback(userId);
      if (cancelled) return;
      if (playback) {
        voiceUrlRef.current = playback.objectUrl;
        setVoiceUrl(playback.objectUrl);
      }
      setVoiceLoading(false);
    })();

    return () => {
      cancelled = true;
      if (voiceUrlRef.current) {
        URL.revokeObjectURL(voiceUrlRef.current);
        voiceUrlRef.current = null;
      }
    };
  }, [step, hasVoiceMemo, userId]);

  const goToStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const skipStep = (stepNumber: number) => {
    trackEvent('calm_hour_step_skipped', { step: stepNumber });
    if (stepNumber < TOTAL_STEPS) goToStep(stepNumber + 1);
    else void finishSession();
  };

  const advanceFromLetter = () => {
    setReviewedLetter(true);
    goToStep(2);
  };

  const advanceFromVoice = () => {
    setReviewedVoiceMemo(true);
    goToStep(3);
  };

  const advanceFromPatterns = () => {
    setReviewedPatterns(true);
    goToStep(4);
  };

  const finishSession = async () => {
    setSaving(true);
    const saved = await insertCalmHourSession(userId, {
      reviewed_letter: reviewedLetter,
      reviewed_voice_memo: reviewedVoiceMemo,
      reviewed_patterns: reviewedPatterns,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (saved) {
      trackEvent('calm_hour_completed', {
        reviewed_letter: reviewedLetter,
        reviewed_voice_memo: reviewedVoiceMemo,
        reviewed_patterns: reviewedPatterns,
        has_notes: Boolean(notes.trim()),
      });
      void useProfileStore.getState().recomputeResilience(userId);
    }
    setDone(true);
  };

  if (done) {
    return (
      <Page>
        <motion.div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
          <p className="text-label uppercase text-tertiary">Calm hour</p>
          <h2 className="mt-qum-md text-h1 text-primary">Check-in complete</h2>
          <p className="mt-qum-sm max-w-sm text-body text-secondary">
            You showed up for future-you outside the urge loop. That rhythm compounds.
          </p>
          <button
            type="button"
            onClick={onDone}
            className="mt-qum-lg w-full max-w-sm bg-tertiary py-3 text-body font-semibold text-on-primary"
          >
            Return home
          </button>
        </motion.div>
      </Page>
    );
  }

  return (
    <Page>
      <motion.div className="flex min-h-full flex-col py-4">
        <p className="text-label uppercase text-secondary">
          Calm hour · {Math.min(step, TOTAL_STEPS)}/{TOTAL_STEPS}
        </p>

        <motion.div className="relative mt-6 flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.section
                key="calm-1"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">Read your letter to yourself</h2>
                <p className="mt-qum-sm text-body text-secondary">
                  No urgency. Just you and what past-you wanted you to remember.
                </p>

                {hasLetter ? (
                  <blockquote className="mt-qum-lg min-h-0 flex-1 overflow-y-auto border-l-2 border-tertiary/40 py-1 pl-4">
                    <p className="whitespace-pre-wrap text-body leading-relaxed text-primary">
                      {letter!.body}
                    </p>
                  </blockquote>
                ) : (
                  <p className="mt-qum-lg text-body text-secondary">
                    You haven&apos;t written a letter yet. You can add one anytime from home.
                  </p>
                )}

                <div className="mt-auto flex flex-col gap-3 pt-qum-lg">
                  {onEditLetter && (
                    <button
                      type="button"
                      onClick={onEditLetter}
                      className="w-full border border-secondary/40 py-3 text-body text-primary"
                    >
                      Edit letter
                    </button>
                  )}
                  {hasLetter && (
                    <button
                      type="button"
                      onClick={advanceFromLetter}
                      className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                    >
                      Continue
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (hasLetter ? skipStep(1) : goToStep(2))}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary"
                  >
                    {hasLetter ? 'Skip' : 'Next'}
                  </button>
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="calm-2"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">Listen to your voice memo</h2>
                <p className="mt-qum-sm text-body text-secondary">
                  Why this matters — in your own voice.
                </p>

                <motion.div className="mt-qum-lg flex flex-1 flex-col items-center justify-center gap-4">
                  {hasVoiceMemo ? (
                    voiceLoading ? (
                      <p className="text-body text-secondary">Loading…</p>
                    ) : voiceUrl ? (
                      <>
                        <audio ref={audioRef} src={voiceUrl} controls className="w-full max-w-xs" />
                      </>
                    ) : (
                      <p className="text-body text-secondary">Could not load memo.</p>
                    )
                  ) : (
                    <p className="text-body text-secondary">
                      No voice memo yet. Record one from Account → Voice memo.
                    </p>
                  )}
                </motion.div>

                <div className="mt-auto flex flex-col gap-3 pt-qum-lg">
                  {onReRecordVoice && hasVoiceMemo && (
                    <button
                      type="button"
                      onClick={onReRecordVoice}
                      className="w-full border border-secondary/40 py-3 text-body text-primary"
                    >
                      Re-record voice memo
                    </button>
                  )}
                  {hasVoiceMemo && voiceUrl && (
                    <button
                      type="button"
                      onClick={advanceFromVoice}
                      className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                    >
                      Continue
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => skipStep(2)}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="py-2 text-label uppercase text-secondary"
                  >
                    Back
                  </button>
                </div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                key="calm-3"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">Last week&apos;s patterns</h2>
                <p className="mt-qum-sm text-body text-secondary">
                  Triggers and places from the past 7 days — context, not judgment.
                </p>

                <motion.div className="mt-qum-md min-h-0 flex-1 overflow-y-auto">
                  <PatternBreakdownSection
                    breakdown={breakdown}
                    loading={patternsLoading}
                    periodLabel="7d"
                    compact
                  />
                </motion.div>

                <motion.div className="mt-auto flex flex-col gap-3 pt-qum-md">
                  <button
                    type="button"
                    onClick={advanceFromPatterns}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => skipStep(3)}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="py-2 text-label uppercase text-secondary"
                  >
                    Back
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 4 && (
              <motion.section
                key="calm-4"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">Anything you want to write down?</h2>
                <p className="mt-qum-sm text-body text-secondary">Optional. Private to you.</p>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  className="mt-qum-lg min-h-0 flex-1 resize-none border border-secondary/40 bg-surface p-3 text-body leading-relaxed text-primary"
                  placeholder="Reflections, intentions, observations…"
                />

                <motion.div className="mt-auto flex flex-col gap-3 pt-qum-lg">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void finishSession()}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : 'Finish check-in'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      trackEvent('calm_hour_step_skipped', { step: 4 });
                      void finishSession();
                    }}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary disabled:opacity-40"
                  >
                    Skip notes
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="py-2 text-label uppercase text-secondary"
                  >
                    Back
                  </button>
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </Page>
  );
}
