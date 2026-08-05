import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { readRaw, writeRaw } from '@/lib/storage/appStorage';
import { STORAGE_KEYS } from '@/lib/storage/keys';

let hapticsEnabled = true;

/** Call once after initAppStorage() on boot. */
export function initHapticsFromStorage(): void {
  const raw = readRaw(STORAGE_KEYS.HAPTICS_ENABLED);
  hapticsEnabled = raw !== 'false';
}

export function getHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  writeRaw(STORAGE_KEYS.HAPTICS_ENABLED, enabled ? 'true' : 'false');
}

function run(action: () => Promise<void>): void {
  if (!Capacitor.isNativePlatform() || !hapticsEnabled) return;
  void action().catch(() => {});
}

export const haptic = {
  light(): void {
    // selectionChanged() was previously used here, but it is completely ignored by many mid-range/budget
    // Android ERM motors because the signal is too short/weak to spin them up.
    // Bumping to standard Light impact ensures haptics work reliably on all Android devices.
    run(() => Haptics.impact({ style: ImpactStyle.Light }));
  },
  medium(): void {
    // Standard Light impact is highly moderated and pleasant on premium motors.
    run(() => Haptics.impact({ style: ImpactStyle.Light }));
  },
  heavy(): void {
    // Downgrade to standard Medium impact to keep it subtle.
    run(() => Haptics.impact({ style: ImpactStyle.Medium }));
  },
  success(): void {
    // Multi-pulse notification bleeps are extremely loud and buzzy on Android.
    // Instead, do a sophisticated double-tick (light impact + selection changed 80ms later).
    run(async () => {
      await Haptics.impact({ style: ImpactStyle.Light });
      await new Promise((resolve) => setTimeout(resolve, 80));
      await Haptics.selectionChanged();
    });
  },
  warning(): void {
    run(() => Haptics.impact({ style: ImpactStyle.Light }));
  },
  error(): void {
    run(() => Haptics.impact({ style: ImpactStyle.Medium }));
  },
  select(): void {
    run(() => Haptics.selectionChanged());
  },
};
