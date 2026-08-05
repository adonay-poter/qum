import { TapCountVerifier } from './TapCountVerifier';
import { useWaveStore } from '@/stores/waveStore';
import { useWaveTimer } from '@/hooks/useWaveTimer';

export function Phase1Body() {
  const task = useWaveStore((s) => s.phase1Task);
  const { phase1Remaining } = useWaveTimer();
  const target = task?.tap_target ?? 10;

  if (!task) {
    return <p className="text-body text-secondary">Loading body task…</p>;
  }

  const mins = Math.floor(phase1Remaining / 60);
  const secs = phase1Remaining % 60;

  return (
    <section className="flex flex-col">
      <p className="text-label uppercase text-tertiary">Phase 1 — Body</p>
      <h2 className="mt-qum-sm text-h1 text-primary">{task.prompt_text}</h2>
      <p className="mt-qum-sm text-body text-secondary">
        Phase ends in {mins}:{secs.toString().padStart(2, '0')}
      </p>
      <TapCountVerifier target={target} />
    </section>
  );
}
