/** When the optional Next control unlocks (seconds elapsed on this step). */
export function stillnessSkipUnlockSec(stepDurationSec: number): number {
  const sixtyPercent = Math.ceil(stepDurationSec * 0.6);
  return Math.max(8, sixtyPercent);
}
