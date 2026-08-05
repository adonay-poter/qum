import { AMHARIC_GLYPH, type LockupSize } from '@/design-system/tokens';
import { LOCKUP_METRICS } from '@/design-system/identity/lockupSizes';

interface BilingualLockupProps {
  size?: LockupSize;
  className?: string;
}

/** Primary lockup: ቁም + hairline + QUM. Tagline at md and above. */
export function BilingualLockup({ size = 'md', className = '' }: BilingualLockupProps) {
  const m = LOCKUP_METRICS[size];

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="flex items-end" style={{ gap: m.gapPx }}>
        <span
          className="font-bela leading-none text-tertiary"
          style={{ fontSize: m.glyphPx }}
          aria-hidden
        >
          {AMHARIC_GLYPH}
        </span>
        <span
          className="shrink-0 bg-secondary/40"
          style={{ width: 1, height: m.hairlinePx }}
          aria-hidden
        />
        <span
          className="font-mono font-semibold uppercase leading-none tracking-[0.14em] text-primary"
          style={{ fontSize: m.qumPx }}
        >
          QUM
        </span>
      </div>
      {m.showTagline && (
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-secondary">
          Stand. Halt.
        </p>
      )}
    </div>
  );
}
