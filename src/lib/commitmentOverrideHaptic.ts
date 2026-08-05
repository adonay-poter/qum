import { haptic } from '@/lib/haptics';

/** Fires success once per screen session when reason length crosses 80. */
let crossedThisSession = false;

export function resetCommitmentOverrideHapticGate(): void {
  crossedThisSession = false;
}

/** Wire from CommitmentCheckScreen textarea onChange (prev length → next length). */
export function onOverrideReasonLengthChange(prevLength: number, nextLength: number): void {
  if (crossedThisSession) return;
  if (prevLength < 80 && nextLength >= 80) {
    crossedThisSession = true;
    haptic.success();
  }
}
