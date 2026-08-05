import { tokens } from '@/design-system/tokens';

interface HaltBarProps {
  /** Total height of the bar in px */
  height?: number;
  className?: string;
}

/** Solo primary mark — vertical orange halt bar. */
export function HaltBar({ height = 32, className = '' }: HaltBarProps) {
  const width = Math.max(3, Math.round(height * 0.2));
  return (
    <span className={`inline-block shrink-0 ${className}`} aria-hidden>
      <span
        className="block"
        style={{
          width,
          height,
          backgroundColor: tokens.accent,
        }}
      />
    </span>
  );
}
