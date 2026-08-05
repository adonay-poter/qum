import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { Page } from '@/components/layout/Page';
import { fadeUp } from '@/lib/motion';
import {
  COMMITMENT_DURATION_OPTIONS,
  COMMITMENT_PLEDGE_PLACEHOLDER,
} from '@/types/commitment';

interface SetCommitmentScreenProps {
  userId: string;
  onDone: () => void;
}

export function SetCommitmentScreen({ userId, onDone }: SetCommitmentScreenProps) {
  const create = useCommitmentStore((s) => s.create);
  const [hours, setHours] = useState(4);
  const [pledge, setPledge] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    await create(userId, { pledge, durationHours: hours });
    setSaving(false);
    onDone();
  };

  return (
    <Page>
      <motion.div
        className="flex min-h-full flex-col py-4"
        variants={fadeUp}
        initial="initial"
        animate="animate"
      >
        <button
          type="button"
          onClick={onDone}
          className="self-start py-2 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Set a commitment</h1>
        <p className="mt-2 text-body text-secondary">
          Lock your intent for a high-risk window. Every Urge tap during that time shows your words
          again — the commitment stays until the window ends.
        </p>

        <p className="mt-qum-lg text-label uppercase text-secondary">Duration</p>
        <motion.div className="mt-qum-md flex flex-wrap gap-2">
          {COMMITMENT_DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              onClick={() => setHours(opt.hours)}
              className={`border px-3 py-2 text-body ${
                hours === opt.hours
                  ? 'border-tertiary bg-tertiary/15 text-primary'
                  : 'border-secondary/40 text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>

        <p className="mt-qum-lg text-label uppercase text-secondary">Pledge</p>
        <textarea
          value={pledge}
          onChange={(e) => setPledge(e.target.value.slice(0, 240))}
          rows={4}
          placeholder={COMMITMENT_PLEDGE_PLACEHOLDER}
          className="mt-qum-md w-full resize-none border border-secondary/40 bg-surface px-3 py-2 font-mono text-body text-primary placeholder:text-secondary/60"
        />

        <button
          type="button"
          disabled={saving || pledge.trim().length < 10}
          onClick={() => void handleCreate()}
          className="mt-auto w-full bg-tertiary py-3 text-body font-semibold text-on-primary disabled:opacity-40"
        >
          {saving ? 'Activating…' : 'Activate commitment'}
        </button>
      </motion.div>
    </Page>
  );
}
