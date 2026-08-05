import { motion } from 'framer-motion';
import { useCommitmentSlice } from '@/hooks/useCommitmentSlice';

interface CommitmentsPanelProps {
  onSetCommitment: () => void;
  onBreakCommitment: () => void;
}

function formatWindow(endsAt: string): string {
  return new Date(endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function CommitmentsPanel({ onSetCommitment, onBreakCommitment }: CommitmentsPanelProps) {
  const { active, upcoming } = useCommitmentSlice();

  return (
    <motion.div
      className="mt-4 border border-secondary/20 bg-surface/30 backdrop-blur-sm rounded-lg p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
    >
      <motion.div className="flex items-start justify-between gap-3">
        <p className="text-label uppercase text-secondary">Commitments</p>
        <button
          type="button"
          onClick={onSetCommitment}
          className="text-label uppercase text-tertiary"
        >
          + Set a commitment
        </button>
      </motion.div>

      {active ? (
        <motion.div className="mt-qum-md border border-tertiary/25 bg-tertiary/5 rounded p-3">
          <p className="text-label uppercase text-tertiary">Active now</p>
          <p className="mt-1 text-body text-primary font-medium">{active.pledge}</p>
          <p className="mt-1 text-[0.75rem] text-secondary">
            Until {formatWindow(active.ends_at)}
          </p>
          <button
            type="button"
            onClick={onBreakCommitment}
            className="mt-3 text-[0.68rem] font-normal uppercase tracking-[0.1em] text-secondary/70 underline-offset-2 hover:underline"
          >
            I broke this commitment
          </button>
        </motion.div>
      ) : (
        <p className="mt-qum-md text-body text-secondary">No active commitment.</p>
      )}

      {upcoming.length > 0 && (
        <ul className="mt-qum-md space-y-2 text-body text-secondary">
          {upcoming.map((c) => (
            <li key={c.id}>
              Starts {new Date(c.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
