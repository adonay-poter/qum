import { useEffect } from 'react';
import { trackEvent } from '@/services/telemetryService';

export type BriefOpenSource = 'settings' | 'home' | 'onboarding';

interface BriefScreenProps {
  source: BriefOpenSource;
  onDone: () => void;
}

/** Full-screen embed of the static QUM science brief (`public/brief/`). */
export function BriefScreen({ source, onDone }: BriefScreenProps) {
  useEffect(() => {
    trackEvent('brief_opened', { source });
  }, [source]);

  return (
    <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center border-b border-secondary/20 bg-surface px-3 py-2">
          <button
            type="button"
            onClick={onDone}
            aria-label="Close brief"
            className="px-2 py-1 text-label uppercase text-secondary"
          >
            ← Back
          </button>
          <span className="ml-2 text-label uppercase text-secondary/80">Why urges pass</span>
        </div>
        <iframe
          title="QUM brief — why urges pass"
          src="./brief/index.html"
          className="min-h-0 flex-1 border-0 bg-[#0E0D0A]"
        />
    </div>
  );
}
