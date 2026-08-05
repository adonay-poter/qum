import { AMHARIC_GLYPH } from '@/design-system/tokens';
import { tokens } from '@/design-system/tokens';
import { HaltBar } from '@/design-system/identity/HaltBar';

interface AppIconProps {
  /** Render size in px (square) */
  size?: number;
  className?: string;
}

/** App-icon composition: centered Halt Bar, corner ቁ, tiny QUM. */
export function AppIcon({ size = 512, className = '' }: AppIconProps) {
  const haltH = Math.round(size * 0.42);
  const glyphPx = Math.round(size * 0.14);
  const qumPx = Math.round(size * 0.07);
  const pad = Math.round(size * 0.1);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: tokens.bg,
      }}
    >
      <HaltBar height={haltH} />
      <span
        className="absolute font-bela leading-none text-tertiary"
        style={{ top: pad, left: pad, fontSize: glyphPx }}
        aria-hidden
      >
        {AMHARIC_GLYPH}
      </span>
      <span
        className="absolute font-mono font-semibold uppercase tracking-[0.12em] text-primary"
        style={{ right: pad, bottom: pad, fontSize: qumPx }}
      >
        QUM
      </span>
    </div>
  );
}
