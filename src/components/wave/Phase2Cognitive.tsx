import { useState } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';
import { PHASE_1_END_SEC } from '@/types/database';
import { validateProofOfWork } from '@/services/powValidationService';
import { CameraVerifier } from './CameraVerifier';
import { TextInputVerifier } from './TextInputVerifier';
import { UrgePassedLink } from './UrgePassedLink';
import { AiValidationLoader } from './AiValidationLoader';

export function Phase2Cognitive() {
  const task = useWaveStore((s) => s.phase2Task);
  const submitPhase2Proof = useWaveStore((s) => s.submitPhase2Proof);
  const { phase2Remaining, elapsedSec } = useWaveTimer();
  const aheadOfSchedule = elapsedSec < PHASE_1_END_SEC + 90;
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [verifierKey, setVerifierKey] = useState(0);

  if (!task) {
    return <p className="text-body text-secondary">Loading cognitive task…</p>;
  }

  const mins = Math.floor(phase2Remaining / 60);
  const secs = phase2Remaining % 60;

  const runValidation = async (payload: { text?: string; imageBase64?: string }) => {
    setValidating(true);
    setError(null);
    setDebugInfo(null);
    setIsOffline(false);

    const result = await validateProofOfWork({
      taskPrompt: task.prompt_text,
      verificationMethod:
        task.verification_method === 'camera_upload' ? 'camera_upload' : 'text_input',
      text: payload.text,
      imageBase64: payload.imageBase64,
    });

    setValidating(false);

    if (!result.isValid) {
      setError(result.reason);
      if (result.debug) setDebugInfo(result.debug);
      if (result.isOffline) {
        setIsOffline(true);
      }
      return;
    }

    submitPhase2Proof();
  };

  const handleRetry = () => {
    setError(null);
    setDebugInfo(null);
    setIsOffline(false);
    setVerifierKey((k) => k + 1);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {validating ? (
        <>
          <p className="text-label uppercase text-tertiary">Phase 2 — Cognitive</p>
          <AiValidationLoader
            mode={task.verification_method === 'camera_upload' ? 'image' : 'text'}
          />
        </>
      ) : (
        <>
          <p className="text-label uppercase text-tertiary">Phase 2 — Cognitive</p>
          <h2 className="mt-2 text-h1 text-primary">{task.prompt_text}</h2>
          {aheadOfSchedule && (
            <p className="mt-2 text-body text-primary">
              Ahead of schedule. Finish this task to begin the cooldown.
            </p>
          )}
          <p className="mt-2 text-body text-secondary">
            Phase window up to {mins}:{secs.toString().padStart(2, '0')}
          </p>
          <p className="mt-1 text-label uppercase text-secondary">Proof of work — AI validated</p>

          {error && (
            <div className="mt-4 border border-tertiary/50 bg-surface p-3 text-left">
              <p className="text-body text-tertiary">{error}</p>
              {debugInfo && !isOffline && (
                <p className="mt-2 break-all text-[0.65rem] leading-relaxed text-secondary">
                  Debug: {debugInfo}
                </p>
              )}
              {isOffline ? (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => submitPhase2Proof()}
                    className="w-full bg-tertiary py-3 text-body font-semibold text-on-primary"
                  >
                    Continue to Cooldown
                  </button>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full border border-secondary/40 py-2 text-body text-secondary"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={validating}
                  className="mt-3 w-full border border-secondary/40 py-2 text-body text-primary disabled:opacity-40"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {task.verification_method === 'camera_upload' && (
            <CameraVerifier
              key={`camera-${verifierKey}`}
              disabled={validating}
              onCapture={(imageBase64) => void runValidation({ imageBase64 })}
            />
          )}

          {task.verification_method === 'text_input' && (
            <TextInputVerifier
              key={`text-${verifierKey}`}
              disabled={validating}
              taskPrompt={task.prompt_text}
              onSubmit={(text) => void runValidation({ text })}
            />
          )}
        </>
      )}

      <UrgePassedLink />
    </section>
  );
}
