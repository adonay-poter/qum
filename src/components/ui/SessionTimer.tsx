import { useWaveTimer } from '@/hooks/useWaveTimer';
import { useWaveStore } from '@/stores/waveStore';

export function SessionTimer() {
  const isLocked = useWaveStore((s) => s.isLocked);
  const mode = useWaveStore((s) => s.mode);
  const { activeRemainingLabel, activeProgress } = useWaveTimer();

  if (!isLocked || mode === 'IDLE') return null;

  const phaseLabel =
    mode === 'PHASE_1_CHOICE' || mode === 'PHASE_1'
      ? 'Phase 1'
      : mode === 'PHASE_2_CHOICE' || mode === 'PHASE_2' || mode === 'PHASE_EXIT_CHECK'
        ? 'Phase 2'
        : mode === 'PHASE_3'
          ? 'Cooldown'
          : 'Surf session';

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-secondary/30 bg-neutral/95 backdrop-blur-sm"
      style={{
        paddingTop: 'var(--qum-safe-top)',
        height: 'calc(var(--qum-safe-top) + var(--qum-session-header))',
      }}
    >
      <div className="flex h-[var(--qum-session-header)] items-center justify-between gap-qum-md px-4">
        <span className="text-label uppercase text-secondary">{phaseLabel}</span>
        <span className="font-semibold tabular-nums text-tertiary">{activeRemainingLabel}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-surface">
        <div
          className="h-full bg-tertiary transition-all duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${activeProgress * 100}%` }}
        />
      </div>
    </header>
  );
}
