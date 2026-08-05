import type { LockupSize } from '@/design-system/tokens';
import { HaltBar } from '@/design-system/identity/HaltBar';
import { LOCKUP_METRICS } from '@/design-system/identity/lockupSizes';

interface CompactLockupProps {
  size?: LockupSize;
  className?: string;
}

/** Fallback lockup: Halt Bar + QUM (no Amharic). */
export function CompactLockup({ size = 'sm', className = '' }: CompactLockupProps) {
  const m = LOCKUP_METRICS[size];

  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: m.gapPx }}>
      <HaltBar height={m.haltBarHeight} />
      <span
        className="font-mono font-semibold uppercase leading-none tracking-[0.14em] text-primary"
        style={{ fontSize: m.qumPx }}
      >
        QUM
      </span>
    </div>
  );
}

