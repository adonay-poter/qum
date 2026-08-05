import { useWaveStore } from '@/stores/waveStore';

interface TapCountVerifierProps {
  target: number;
}

export function TapCountVerifier({ target }: TapCountVerifierProps) {
  const tapCount = useWaveStore((s) => s.tapCount);
  const incrementTap = useWaveStore((s) => s.incrementTap);

  return (
    <div className="mt-qum-lg flex flex-col items-center gap-qum-md">
      <p className="text-label uppercase text-secondary">
        {tapCount} / {target} taps
      </p>
      <button
        type="button"
        onClick={incrementTap}
        className="flex h-48 w-full max-w-sm touch-manipulation select-none flex-col items-center justify-center border-2 border-dashed border-tertiary bg-surface active:bg-tertiary/10"
      >
        <span className="text-h1 font-bold text-tertiary">TAP</span>
        <span className="mt-2 text-label uppercase text-secondary">Tap zone</span>
      </button>
    </div>
  );
}
