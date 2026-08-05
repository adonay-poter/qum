import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Page } from '@/components/layout/Page';
import { LetterStarterPrompts } from '@/components/letter/LetterStarterPrompts';
import { useLetterStore } from '@/stores/letterStore';
import {
  LETTER_SUGGESTED_MAX_CHARS,
  LETTER_SUGGESTED_MIN_CHARS,
} from '@/types/letter';

interface LetterEditorScreenProps {
  userId: string;
  onDone: () => void;
}

export function LetterEditorScreen({ userId, onDone }: LetterEditorScreenProps) {
  const letter = useLetterStore((s) => s.letter);
  const save = useLetterStore((s) => s.save);
  const load = useLetterStore((s) => s.load);

  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void load(userId, { force: true });
  }, [userId, load]);

  useEffect(() => {
    if (letter?.body) setBody(letter.body);
  }, [letter?.body]);

  const trimmed = body.trim();
  const canSave = trimmed.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const saved = await save(userId, trimmed);
    setSaving(false);
    if (!saved) {
      setError('Could not save — try again');
      return;
    }
    onDone();
  };

  return (
    <Page>
      <motion.div className="flex h-full min-h-0 flex-col py-4">
        <p className="text-label uppercase text-secondary">Letter to future you</p>
        <h2 className="mt-qum-sm text-h1 text-primary">Edit your letter</h2>
        <p className="mt-qum-sm text-body text-secondary">
          Future-you reads this during a wave. Speak directly. This stays private.
        </p>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="mt-qum-lg min-h-0 flex-1 resize-none border border-secondary/40 bg-surface p-3 text-body leading-relaxed text-primary"
          placeholder="Write to the version of you who's about to slip…"
        />

        <LetterStarterPrompts
          body={body}
          onBodyChange={setBody}
          textareaRef={textareaRef}
        />

        <p className="mt-2 text-right text-label text-secondary tabular-nums">
          {trimmed.length} chars
          {trimmed.length > 0 && trimmed.length < LETTER_SUGGESTED_MIN_CHARS && (
            <span className="text-secondary/70">
              {' '}
              · {LETTER_SUGGESTED_MIN_CHARS}–{LETTER_SUGGESTED_MAX_CHARS} suggested
            </span>
          )}
        </p>

        {error && <p className="mt-qum-sm text-body text-tertiary">{error}</p>}

        <div className="mt-qum-md flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="flex-1 border border-secondary/30 py-3 text-body text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="flex-[2] bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save letter'}
          </button>
        </div>
      </motion.div>
    </Page>
  );
}
