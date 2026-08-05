import { useEffect } from 'react';
import type { CrisisSeverity } from '@/lib/crisis/signalDetector';
import { haptic } from '@/lib/haptics';

const COPY: Record<CrisisSeverity, string> = {
  soft: 'This week has been heavy. Some people find it helps to talk to someone.',
  firm: "You've been through a lot recently. You don't have to do this alone.",
};

interface SupportCardProps {
  severity: CrisisSeverity;
  onTalkToSomeone: () => void;
  onFindTherapist: () => void;
  onDismiss: () => void;
}

export function SupportCard({
  severity,
  onTalkToSomeone,
  onFindTherapist,
  onDismiss,
}: SupportCardProps) {
  useEffect(() => {
    if (severity === 'soft') haptic.light();
  }, [severity]);

  return (
    <div className="mb-3 border border-secondary/25 bg-surface/80 px-3 py-3">
      <p className="text-body leading-relaxed text-primary">{COPY[severity]}</p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onTalkToSomeone}
          aria-label="Talk to someone now"
          className="w-full border border-secondary/40 py-3 text-body text-primary"
        >
          Talk to someone now
        </button>
        <button
          type="button"
          onClick={onFindTherapist}
          aria-label="Find a therapist"
          className="w-full border border-secondary/30 py-3 text-body text-secondary"
        >
          Find a therapist
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss support card for 48 hours"
          className="w-full py-2 text-[0.68rem] uppercase tracking-[0.12em] text-secondary/70"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
