import { useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LETTER_STARTER_GRADUATION_PICKS,
  LETTER_STARTER_PROMPTS,
} from '@/lib/letter/starterPrompts';
import {
  dismissLetterStarters,
  getLetterStarterPickCount,
  isLetterStartersDismissed,
  recordLetterStarterPick,
} from '@/lib/letter/letterStarterPrefs';
import { trackEvent } from '@/services/telemetryService';

interface LetterStarterPromptsProps {
  body: string;
  onBodyChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  maxLength?: number;
}

export function LetterStarterPrompts({
  body,
  onBodyChange,
  textareaRef,
  maxLength,
}: LetterStarterPromptsProps) {
  const [dismissed, setDismissed] = useState(() => isLetterStartersDismissed());
  const [pickCount, setPickCount] = useState(() => getLetterStarterPickCount());
  const graduated = pickCount >= LETTER_STARTER_GRADUATION_PICKS;
  const [expanded, setExpanded] = useState(() => !graduated);
  const shownTracked = useRef(false);

  const isEmpty = body.length === 0;
  const canOfferStarters = isEmpty && !dismissed;
  const showList = canOfferStarters && expanded;
  const showCollapsedLink = canOfferStarters && !expanded;

  useEffect(() => {
    if (!canOfferStarters) {
      shownTracked.current = false;
      return;
    }
    if (showList && !shownTracked.current) {
      shownTracked.current = true;
      trackEvent('letter_starter_shown');
    }
  }, [canOfferStarters, showList]);

  const focusTextareaAtEnd = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = text.length;
    el.setSelectionRange(end, end);
  };

  const handlePick = (index: number) => {
    const prompt = LETTER_STARTER_PROMPTS[index];
    const next = `${prompt} `;
    const clipped =
      maxLength !== undefined ? next.slice(0, maxLength) : next;
    onBodyChange(clipped);
    setPickCount(recordLetterStarterPick());
    trackEvent('letter_starter_picked', { prompt_index: index });
    setExpanded(false);
    requestAnimationFrame(() => focusTextareaAtEnd(clipped));
  };

  const handleHide = () => {
    dismissLetterStarters();
    setDismissed(true);
    trackEvent('letter_starter_hidden');
    setExpanded(false);
  };

  if (!canOfferStarters && !showCollapsedLink) return null;

  return (
    <div className="mt-qum-sm shrink-0">
      {showCollapsedLink && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-label text-secondary underline-offset-2 hover:underline"
        >
          Show starters
        </button>
      )}

      <AnimatePresence initial={false}>
        {showList && (
          <motion.div
            key="letter-starters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="text-label text-secondary/80">
              Need a starting line? Pick one.
            </p>
            <ul className="mt-1 divide-y divide-secondary/15">
              {LETTER_STARTER_PROMPTS.map((prompt, index) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => handlePick(index)}
                    className="w-full py-[12px] text-left text-body leading-snug text-secondary"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleHide}
              className="mt-1 text-label text-secondary/70 underline-offset-2 hover:underline"
            >
              Hide these
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
