import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '@/lib/platform/native';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { trackEvent } from '@/services/telemetryService';

export const REFLECTION_NOTIFICATION_ID = 9003;
const DELAY_MS = 5 * 60 * 60 * 1000;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Schedule a gentle reflection prompt ~5h after a failed wave (max one per calendar day). */
export async function scheduleReflectionPrompt(options: {
  waveId: string | null;
  failedAt: number;
}): Promise<void> {
  const day = todayKey();
  const last = readJson<{ day: string; waveId: string | null }>(
    STORAGE_KEYS.REFLECTION_SCHEDULE,
  );
  if (last?.day === day) return;

  const fireAt = options.failedAt + DELAY_MS;
  const title = 'QUM — When you\'re ready';
  const body =
    "When you're ready, take a couple minutes to look at what happened. No pressure.";

  if (isNativeApp()) {
    const at = new Date(fireAt);
    if (at.getTime() <= Date.now()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: REFLECTION_NOTIFICATION_ID,
          title,
          body,
          extra: {
            route: 'reflection',
            wave_id: options.waveId,
            mode: 'delayed_prompt',
          },
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  }

  writeJson(STORAGE_KEYS.REFLECTION_SCHEDULE, {
    day,
    waveId: options.waveId,
    fireAt: new Date(fireAt).toISOString(),
    channel: isNativeApp() ? 'native' : 'web',
  });

  trackEvent('reflection_prompt_fired', { wave_id: options.waveId });
}
