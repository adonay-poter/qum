import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { VoiceFieldRecorder } from '@/components/reflect/VoiceFieldRecorder';
import { insertReflection } from '@/services/reflectionService';
import { trackEvent } from '@/services/telemetryService';
import { fadeUp } from '@/lib/motion';
import {
  REFLECTION_LOCATIONS,
  REFLECTION_TRIGGERS,
  REFLECTION_WHEN_PRESETS,
  resolveOccurredAt,
  type ReflectionLocation,
  type ReflectionOpenContext,
  type ReflectionPayload,
  type ReflectionTrigger,
  type ReflectionWhenPreset,
} from '@/types/reflection';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function countSkippedFields(payload: ReflectionPayload, isManual: boolean): number {
  let skipped = 0;
  if (isManual && !payload.occurred_at) skipped += 1;
  if (!payload.trigger && !payload.trigger_audio_path) skipped += 1;
  if (!payload.location && !payload.location_audio_path) skipped += 1;
  if (!payload.loophole?.trim() && !payload.loophole_audio_path) skipped += 1;
  return skipped;
}

interface ReflectionScreenProps {
  userId: string;
  context: ReflectionOpenContext;
  onDone: () => void;
}

export function ReflectionScreen({ userId, context, onDone }: ReflectionScreenProps) {
  const isManual = context.mode === 'manual_log';
  const stepCount = isManual ? 4 : 3;
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    trackEvent('reflection_opened', { mode: context.mode });
  }, [context.mode]);

  const [step, setStep] = useState(0);
  const [whenPreset, setWhenPreset] = useState<ReflectionWhenPreset | null>(null);
  const [customWhen, setCustomWhen] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [trigger, setTrigger] = useState<ReflectionTrigger | null>(null);
  const [triggerOther, setTriggerOther] = useState('');
  const [triggerAudioPath, setTriggerAudioPath] = useState<string | null>(null);
  const [location, setLocation] = useState<ReflectionLocation | null>(null);
  const [locationOther, setLocationOther] = useState('');
  const [locationAudioPath, setLocationAudioPath] = useState<string | null>(null);
  const [loophole, setLoophole] = useState('');
  const [loopholeAudioPath, setLoopholeAudioPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const triggerStep = isManual ? 1 : 0;
  const locationStep = isManual ? 2 : 1;
  const loopholeStep = isManual ? 3 : 2;

  const goNext = () => setStep((s) => Math.min(s + 1, stepCount - 1));

  const buildPayload = (): ReflectionPayload => {
    const occurred_at = isManual
      ? whenPreset
        ? resolveOccurredAt(
            whenPreset,
            whenPreset === 'other' ? new Date(customWhen).toISOString() : undefined,
          )
        : undefined
      : undefined;

    return {
      trigger,
      trigger_other: trigger === 'other' ? triggerOther.trim() || null : null,
      trigger_audio_path: triggerAudioPath,
      location,
      location_other: location === 'other' ? locationOther.trim() || null : null,
      location_audio_path: locationAudioPath,
      loophole: loophole.trim() || null,
      loophole_audio_path: loopholeAudioPath,
      occurred_at,
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = buildPayload();
    await insertReflection(userId, context.waveId, context.mode, payload);
    trackEvent('reflection_submitted', {
      mode: context.mode,
      skipped_field_count: countSkippedFields(payload, isManual),
    });
    setSubmitting(false);
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <Page>
        <motion.div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
          <p className="text-label uppercase text-tertiary">Reflection</p>
          <p className="mt-qum-md text-h1 text-primary">Saved. Be gentle with yourself today.</p>
          <button
            type="button"
            onClick={onDone}
            className="mt-qum-lg w-full max-w-sm bg-tertiary py-3 text-body font-semibold text-on-primary"
          >
            Done
          </button>
        </motion.div>
      </Page>
    );
  }

  return (
    <Page>
      <motion.div className="flex min-h-full flex-col py-4">
        <button
          type="button"
          onClick={onDone}
          className="self-start py-1 text-label uppercase text-secondary"
        >
          Leave anytime
        </button>

        <p className="mt-2 text-label uppercase text-tertiary">Reflection</p>
        <h1 className="mt-qum-sm text-h1 text-primary">When you&apos;re ready</h1>
        <p className="mt-2 text-body text-secondary">
          No pressure. Skip anything. Share only what feels useful.
        </p>

        <motion.div className="mt-qum-md flex gap-2" aria-label="Progress">
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 ${i <= step ? 'bg-tertiary' : 'bg-surface'}`}
            />
          ))}
        </motion.div>

        <motion.div className="relative mt-qum-lg min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {isManual && step === 0 && (
              <motion.section
                key="when"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full flex-col"
              >
                <p className="text-label uppercase text-secondary">When did this happen?</p>
                <motion.div className="mt-qum-md flex flex-wrap gap-2">
                  {REFLECTION_WHEN_PRESETS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setWhenPreset(chip.id)}
                      className={`border px-3 py-2 text-body ${
                        whenPreset === chip.id
                          ? 'border-tertiary bg-tertiary/15 text-primary'
                          : 'border-secondary/40 text-secondary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </motion.div>
                {whenPreset === 'other' && (
                  <input
                    type="datetime-local"
                    value={customWhen}
                    max={toDatetimeLocalValue(new Date().toISOString())}
                    onChange={(e) => setCustomWhen(e.target.value)}
                    className="mt-qum-md w-full border border-secondary/40 bg-surface px-3 py-2 text-body text-primary"
                  />
                )}
                <motion.div className="mt-auto flex flex-col gap-2 pt-qum-lg">
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Continue
                  </button>
                  <button type="button" onClick={goNext} className="py-2 text-body text-secondary">
                    Skip
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === triggerStep && (
              <motion.section
                key="trigger"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full flex-col"
              >
                <p className="text-label uppercase text-secondary">
                  What were you up against?
                </p>
                <motion.div className="mt-qum-md flex flex-wrap gap-2">
                  {REFLECTION_TRIGGERS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setTrigger(chip.id)}
                      className={`border px-3 py-2 text-body ${
                        trigger === chip.id
                          ? 'border-tertiary bg-tertiary/15 text-primary'
                          : 'border-secondary/40 text-secondary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </motion.div>
                {trigger === 'other' && (
                  <input
                    type="text"
                    value={triggerOther}
                    onChange={(e) => setTriggerOther(e.target.value)}
                    placeholder="In your own words"
                    className="mt-qum-md w-full border border-secondary/40 bg-surface px-3 py-2 text-body text-primary"
                  />
                )}
                <VoiceFieldRecorder
                  userId={userId}
                  sessionId={sessionId}
                  field="trigger"
                  onRecorded={setTriggerAudioPath}
                />
                <motion.div className="mt-auto flex flex-col gap-2 pt-qum-lg">
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Continue
                  </button>
                  <button type="button" onClick={goNext} className="py-2 text-body text-secondary">
                    Skip
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === locationStep && (
              <motion.section
                key="location"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full flex-col"
              >
                <p className="text-label uppercase text-secondary">Where were you?</p>
                <motion.div className="mt-qum-md flex flex-wrap gap-2">
                  {REFLECTION_LOCATIONS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setLocation(chip.id)}
                      className={`border px-3 py-2 text-body ${
                        location === chip.id
                          ? 'border-tertiary bg-tertiary/15 text-primary'
                          : 'border-secondary/40 text-secondary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </motion.div>
                {location === 'other' && (
                  <input
                    type="text"
                    value={locationOther}
                    onChange={(e) => setLocationOther(e.target.value)}
                    placeholder="In your own words"
                    className="mt-qum-md w-full border border-secondary/40 bg-surface px-3 py-2 text-body text-primary"
                  />
                )}
                <VoiceFieldRecorder
                  userId={userId}
                  sessionId={sessionId}
                  field="location"
                  onRecorded={setLocationAudioPath}
                />
                <motion.div className="mt-auto flex flex-col gap-2 pt-qum-lg">
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Continue
                  </button>
                  <button type="button" onClick={goNext} className="py-2 text-body text-secondary">
                    Skip
                  </button>
                </motion.div>
              </motion.section>
            )}

            {step === loopholeStep && (
              <motion.section
                key="loophole"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full flex-col"
              >
                <p className="text-label uppercase text-secondary">What got in?</p>
                <textarea
                  value={loophole}
                  onChange={(e) => setLoophole(e.target.value.slice(0, 280))}
                  maxLength={280}
                  rows={5}
                  className="mt-qum-md w-full resize-none border border-secondary/40 bg-surface px-3 py-2 font-mono text-body text-primary"
                  placeholder="Optional — whatever feels true"
                />
                <VoiceFieldRecorder
                  userId={userId}
                  sessionId={sessionId}
                  field="loophole"
                  onRecorded={setLoopholeAudioPath}
                />
                <motion.div className="mt-auto flex flex-col gap-2 pt-qum-lg">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
                  >
                    {submitting ? 'Saving…' : 'Save reflection'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    className="py-2 text-body text-secondary disabled:opacity-40"
                  >
                    Skip and save
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
