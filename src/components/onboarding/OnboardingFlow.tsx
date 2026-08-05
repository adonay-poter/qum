import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { BilingualLockup } from '@/design-system/identity';
import { OnboardingVoiceMemoStep } from '@/components/onboarding/OnboardingVoiceMemoStep';
import { LetterStarterPrompts } from '@/components/letter/LetterStarterPrompts';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore } from '@/stores/profileStore';
import { useLetterStore } from '@/stores/letterStore';
import {
  LETTER_SUGGESTED_MAX_CHARS,
  LETTER_SUGGESTED_MIN_CHARS,
} from '@/types/letter';
import { requestNotificationPermission } from '@/services/notificationService';
import { requestCameraPermission } from '@/services/cameraService';
import { trackEvent } from '@/services/telemetryService';
import { slideX } from '@/lib/motion';
import {
  ADDICTION_TYPES,
  NORTH_STAR_OPTIONS,
  northStarLabel,
  type AddictionType,
  type NorthStarId,
  type OnboardingData,
} from '@/types/onboarding';

const TOTAL_STEPS = 7;

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${suffix}`;
}

export function OnboardingFlow() {
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const { user } = useAuth();
  const profileUserId = useProfileStore((s) => s.userId);
  const userId = profileUserId ?? user?.id ?? null;
  const saveLetter = useLetterStore((s) => s.save);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [addictionType, setAddictionType] = useState<AddictionType | null>(null);
  const [addictionOther, setAddictionOther] = useState('');
  const [peakDangerHour, setPeakDangerHour] = useState(21);
  const [physicalBaseline, setPhysicalBaseline] = useState(10);
  const [northStar, setNorthStar] = useState<NorthStarId | null>(null);
  const [voiceMemoPath, setVoiceMemoPath] = useState<string | null>(null);
  const [voiceMemoInWave, setVoiceMemoInWave] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [letterBody, setLetterBody] = useState('');
  const [savingLetter, setSavingLetter] = useState(false);
  const letterTextareaRef = useRef<HTMLTextAreaElement>(null);

  const goToStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const step2Valid =
    addictionType !== null &&
    (addictionType !== 'other' || addictionOther.trim().length > 0);

  const step3Valid = physicalBaseline >= 1;

  const buildPayload = (): OnboardingData => ({
    addiction_type: addictionType!,
    addiction_type_other:
      addictionType === 'other' ? addictionOther.trim() : null,
    peak_danger_hour: peakDangerHour,
    physical_baseline: physicalBaseline,
    north_star: northStar ? northStarLabel(northStar) : null,
    voice_memo_path: voiceMemoPath,
    voice_memo_in_wave_enabled: voiceMemoInWave,
  });

  const handleAddictionContinue = () => {
    if (!addictionType) return;
    trackEvent('onboarding_addiction_selected', {
      type: addictionType,
      has_other_text: addictionType === 'other',
    });
    goToStep(3);
  };

  const handleSaveLetterAndContinue = async () => {
    const trimmed = letterBody.trim();
    if (!trimmed || !userId) {
      goToStep(6);
      return;
    }
    setSavingLetter(true);
    await saveLetter(userId, trimmed);
    setSavingLetter(false);
    goToStep(6);
  };

  const handleSkipLetter = () => {
    trackEvent('letter_skipped_in_onboarding');
    goToStep(6);
  };

  const handleFinish = async () => {
    if (!step2Valid || !step3Valid || !addictionType) return;
    setFinishing(true);
    setFinishError(null);

    try {
      await requestNotificationPermission();
      await requestCameraPermission();

      const result = await completeOnboarding(buildPayload());
      if (!result.ok) {
        setFinishError(result.error ?? 'Could not complete setup');
      }
    } catch {
      setFinishError('Permission or network error — try again');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Page>
      <motion.div className="flex min-h-full flex-col py-4">
        <p className="text-label uppercase text-secondary">
          Setup · {step}/{TOTAL_STEPS}
        </p>

        <motion.div className="relative mt-6 flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.section
                key="step-1"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <BilingualLockup size="lg" className="mb-6 items-start" />
                <h1 className="text-h1 text-primary">Break the reflex</h1>
                <p className="mt-qum-md max-w-md text-body text-secondary">
                  QUM intercepts the urge loop before it hijacks your prefrontal cortex. You are
                  not fighting willpower — you are installing a tactical pause.
                </p>
                <p className="mt-qum-md max-w-md text-body text-secondary">
                  This calibration takes under two minutes. Your shield activates when you finish.
                </p>
                <motion.div className="mt-auto pt-qum-lg">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="w-full bg-tertiary px-5 py-3 text-body font-semibold text-on-primary"
                  >
                    Initialize Shield
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="step-2-addiction"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">
                  What are you trying to break the reflex on?
                </h2>
                <p className="mt-qum-sm text-body text-secondary">
                  Pick one. This stays private and tunes your experience.
                </p>

                <motion.div className="mt-qum-md grid grid-cols-2 gap-2">
                  {ADDICTION_TYPES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAddictionType(option.id)}
                      className={`border px-3 py-3 text-left text-body transition-colors ${
                        addictionType === option.id
                          ? 'border-tertiary bg-tertiary/10 text-primary'
                          : 'border-secondary/30 text-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>

                {addictionType === 'other' && (
                  <input
                    type="text"
                    value={addictionOther}
                    onChange={(e) => setAddictionOther(e.target.value)}
                    placeholder="Describe briefly…"
                    className="mt-qum-md w-full border border-secondary/40 bg-surface px-3 py-3 text-body text-primary"
                  />
                )}

                <motion.div className="mt-auto flex gap-3 pt-qum-md">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="flex-1 border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!step2Valid}
                    onClick={handleAddictionContinue}
                    className="flex-[2] bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
                  >
                    Continue
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                key="step-3-calibrate"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col gap-qum-lg"
              >
                <motion.div>
                  <h2 className="text-h1 text-primary">Calibrate threat matrix</h2>
                  <p className="mt-qum-sm text-body text-secondary">
                    When do urges usually spike? We use this for the predictive radar.
                  </p>
                  <motion.div className="mt-qum-md border border-secondary/30 bg-surface p-4">
                    <div className="flex items-center justify-between text-label uppercase text-secondary">
                      <span>Risk window</span>
                      <span className="text-primary">{formatHour(peakDangerHour)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={peakDangerHour}
                      onChange={(e) => setPeakDangerHour(Number(e.target.value))}
                      className="mt-4 w-full accent-tertiary"
                    />
                  </motion.div>
                </motion.div>

                <motion.div>
                  <p className="text-label uppercase text-secondary">Fitness baseline</p>
                  <p className="mt-qum-sm text-body text-secondary">
                    Pushups you can complete comfortably — scales Phase 1 physical tasks.
                  </p>
                  <motion.div className="mt-qum-md flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPhysicalBaseline((n) => Math.max(1, n - 1))}
                      className="border border-secondary/40 px-4 py-2 text-body text-primary"
                    >
                      −
                    </button>
                    <span className="min-w-[3rem] text-center text-h1 text-primary">
                      {physicalBaseline}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhysicalBaseline((n) => Math.min(50, n + 1))}
                      className="border border-secondary/40 px-4 py-2 text-body text-primary"
                    >
                      +
                    </button>
                  </motion.div>
                </motion.div>

                <motion.div>
                  <p className="text-label uppercase text-secondary">
                    North star <span className="normal-case text-secondary/70">(optional)</span>
                  </p>
                  <p className="mt-qum-sm text-body text-secondary">
                    The core reason you are breaking the loop.
                  </p>
                  <motion.div className="mt-qum-md flex flex-col gap-2">
                    {NORTH_STAR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setNorthStar((current) =>
                            current === option.id ? null : option.id,
                          )
                        }
                        className={`border px-4 py-3 text-left text-body transition-colors ${
                          northStar === option.id
                            ? 'border-tertiary bg-tertiary/10 text-primary'
                            : 'border-secondary/30 text-secondary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </motion.div>

                <motion.div className="mt-auto flex gap-3 pt-qum-md">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="flex-1 border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!step3Valid}
                    onClick={() => goToStep(4)}
                    className="flex-[2] bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
                  >
                    Continue
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 4 && userId && (
              <motion.section
                key="step-4-voice"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <OnboardingVoiceMemoStep
                  userId={userId}
                  onSaved={(path, inWave) => {
                    setVoiceMemoPath(path);
                    setVoiceMemoInWave(inWave);
                    goToStep(5);
                  }}
                  onSkip={() => goToStep(5)}
                  onBack={() => goToStep(3)}
                />
              </motion.section>
            )}

            {step === 5 && (
              <motion.section
                key="step-5-letter"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">
                  Write a letter to the version of you who&apos;s about to slip.
                </h2>
                <p className="mt-qum-sm text-body text-secondary">
                  Future-you will read this during a wave. Speak directly. Be honest. This stays
                  private.
                </p>

                <textarea
                  ref={letterTextareaRef}
                  value={letterBody}
                  onChange={(e) =>
                    setLetterBody(e.target.value.slice(0, LETTER_SUGGESTED_MAX_CHARS + 200))
                  }
                  rows={8}
                  className="mt-qum-lg min-h-0 flex-1 resize-none border border-secondary/40 bg-surface p-3 text-body leading-relaxed text-primary"
                  placeholder="Dear future me…"
                />

                <LetterStarterPrompts
                  body={letterBody}
                  onBodyChange={setLetterBody}
                  textareaRef={letterTextareaRef}
                  maxLength={LETTER_SUGGESTED_MAX_CHARS + 200}
                />

                <p className="mt-2 text-label text-secondary">
                  {letterBody.trim().length} chars · {LETTER_SUGGESTED_MIN_CHARS}–
                  {LETTER_SUGGESTED_MAX_CHARS} suggested
                </p>

                <motion.div className="mt-auto flex flex-col gap-3 pt-qum-lg">
                  <button
                    type="button"
                    disabled={!letterBody.trim() || savingLetter}
                    onClick={() => void handleSaveLetterAndContinue()}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
                  >
                    {savingLetter ? 'Saving…' : 'Save and continue'}
                  </button>
                  <button
                    type="button"
                    disabled={savingLetter}
                    onClick={handleSkipLetter}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="py-2 text-label uppercase text-secondary"
                  >
                    Back
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 6 && (
              <motion.section
                key="step-6-wave"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">The wave</h2>
                <p className="mt-qum-sm text-body text-secondary">
                  Two mechanics you need before your first surf.
                </p>

                <motion.div className="mt-qum-lg space-y-3">
                  <motion.div className="border border-secondary/30 bg-surface p-4">
                    <p className="text-label uppercase text-tertiary">10-minute lock</p>
                    <p className="mt-2 text-body text-secondary">
                      Tapping Urge SURF starts a timed session across three phases. Stay with it
                      until you finish — or step away; the wave ends gently and your shield holds steady.
                    </p>
                  </motion.div>
                  <motion.div className="border border-secondary/30 bg-surface p-4">
                    <p className="text-label uppercase text-tertiary">Resilience shield</p>
                    <p className="mt-2 text-body text-secondary">
                      Your shield runs 0–100. Completing a wave adds +5. Stepping away mid-wave does
                      not reduce it — progress is preserved, not erased.
                    </p>
                  </motion.div>
                </motion.div>

                <motion.div className="mt-auto flex gap-3 pt-qum-lg">
                  <button
                    type="button"
                    onClick={() => goToStep(5)}
                    className="flex-1 border border-secondary/30 py-3 text-body text-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(7)}
                    className="flex-[2] bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Acknowledge
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === 7 && (
              <motion.section
                key="step-7-permissions"
                custom={direction}
                variants={slideX(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-1 flex-col"
              >
                <h2 className="text-h1 text-primary">Weaponize permissions</h2>
                <p className="mt-qum-sm text-body text-secondary">
                  QUM uses native device access for two systems. Denying is allowed — you can
                  enable later in settings.
                </p>

                <motion.div className="mt-qum-lg space-y-3">
                  <motion.div className="border border-secondary/30 bg-surface p-4">
                    <p className="text-label uppercase text-tertiary">Predictive urge radar</p>
                    <p className="mt-2 text-body text-secondary">
                      Local notifications warn you ~15 minutes before your peak window (
                      {formatHour(peakDangerHour)}). Uses Capacitor native notification APIs.
                    </p>
                  </motion.div>
                  <motion.div className="border border-secondary/30 bg-surface p-4">
                    <p className="text-label uppercase text-tertiary">Proof-of-work validator</p>
                    <p className="mt-2 text-body text-secondary">
                      Camera access for Phase 2 cognitive tasks — photo proof validated before you
                      advance.
                    </p>
                  </motion.div>
                </motion.div>

                {finishError && (
                  <p className="mt-qum-md text-body text-tertiary">{finishError}</p>
                )}

                <motion.div className="mt-auto flex flex-col gap-3 pt-qum-lg">
                  <button
                    type="button"
                    disabled={finishing}
                    onClick={() => void handleFinish()}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-50"
                  >
                    {finishing ? 'Activating…' : 'Grant & Enter QUM'}
                  </button>
                  <button
                    type="button"
                    disabled={finishing}
                    onClick={() => void handleFinish()}
                    className="w-full border border-secondary/30 py-3 text-body text-secondary disabled:opacity-50"
                  >
                    Skip permissions — enter anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(6)}
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
