import { HaltBar } from '@/design-system/identity/HaltBar';

interface HaltBarLoaderProps {
  height?: number;
  className?: string;
}

/** Loading mark — pulsing Halt Bar at reduced opacity. */
export function HaltBarLoader({ height = 28, className = '' }: HaltBarLoaderProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <HaltBar height={height} className="animate-pulse opacity-30" />
    </div>
  );
}
