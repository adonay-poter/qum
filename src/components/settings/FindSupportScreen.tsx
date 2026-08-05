import { useMemo } from 'react';
import { Page } from '@/components/layout/Page';
import { HotlineList } from '@/components/crisis/HotlineList';
import {
  getHotlinesForAddiction,
  psychologyTodayTherapistUrl,
} from '@/lib/crisis/hotlines';
import { openSupportLink } from '@/lib/crisis/openSupportLink';
import { trackEvent } from '@/services/telemetryService';
interface FindSupportScreenProps {
  addictionType: string | null;
  includeCrisisExtras?: boolean;
  onDone: () => void;
}

export function FindSupportScreen({
  addictionType,
  includeCrisisExtras = true,
  onDone,
}: FindSupportScreenProps) {
  const hotlines = useMemo(
    () =>
      getHotlinesForAddiction(addictionType, {
        includeCrisisExtras,
      }),
    [addictionType, includeCrisisExtras],
  );

  const trackAction = (action: 'talk' | 'therapist' | 'hotline', hotlineId?: string) => {
    trackEvent('crisis_action_tapped', {
      action,
      hotline_id: hotlineId ?? null,
      surface: 'find_support',
    });
  };

  const openTherapistSearch = () => {
    trackAction('therapist');
    void openSupportLink(psychologyTodayTherapistUrl());
  };

  return (
    <Page>
      <div className="flex h-full min-h-0 flex-col py-4">
        <button
          type="button"
          onClick={onDone}
          className="self-start px-2 py-1 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Find support</h1>
        <p className="mt-2 text-body text-secondary">
          Real people, real help. QUM is not a substitute for professional care when you need
          it.
        </p>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <HotlineList
            hotlines={hotlines}
            onLineTapped={(id) => trackAction('hotline', id)}
          />
        </div>

        <button
          type="button"
          onClick={openTherapistSearch}
          className="mt-4 w-full border border-secondary/40 py-4 text-body text-primary"
        >
          Find a therapist
        </button>

        <p className="mt-3 text-center text-[0.65rem] leading-relaxed text-secondary/70">
          If you are in immediate danger, call emergency services (911 in the US).
        </p>
      </div>
    </Page>
  );
}
