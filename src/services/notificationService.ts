import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from '@/lib/platform/native';
import { pickGroundingInsight } from '@/data/groundingInsights';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';

const URGE_NOTIFICATION_ID = 9001;
export const CALM_HOUR_NOTIFICATION_ID = 9002;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function scheduleUrgeWarning(peakHour: number): Promise<void> {
  const warnHour = (peakHour + 24 - 1) % 24;
  const warnMinute = 45;
  const today = new Date().toISOString().slice(0, 10);

  const last = readJson<{ peakHour: number; scheduledAt: string }>(
    STORAGE_KEYS.NOTIFICATION_SCHEDULE,
  );
  if (last?.peakHour === peakHour && last.scheduledAt === today) return;

  const body = pickGroundingInsight(peakHour);
  const title = 'QUM — Urge window incoming';

  if (isNativeApp()) {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    await LocalNotifications.cancel({ notifications: [{ id: URGE_NOTIFICATION_ID }] });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: URGE_NOTIFICATION_ID,
          title,
          body,
          schedule: {
            on: { hour: warnHour, minute: warnMinute },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    });

    writeJson(STORAGE_KEYS.NOTIFICATION_SCHEDULE, {
      peakHour,
      scheduledAt: today,
      warnAt: `${warnHour}:${warnMinute}`,
      channel: 'native',
    });
    return;
  }

  if (!('Notification' in window)) return;

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;

  const now = new Date();
  const target = new Date();
  target.setHours(warnHour, warnMinute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - now.getTime();
  window.setTimeout(() => {
    new Notification(title, { body, tag: 'qum-urge-warning' });
  }, delay);

  writeJson(STORAGE_KEYS.NOTIFICATION_SCHEDULE, {
    peakHour,
    scheduledAt: today,
    warnAt: target.toISOString(),
    channel: 'web',
  });
}

/** Capacitor weekday: 1 = Sunday … 7 = Saturday. */
function toCapacitorWeekday(jsDay: number): number {
  return jsDay === 0 ? 1 : jsDay + 1;
}

export async function scheduleCalmHourCheckIn(options: {
  hour: number;
  weekday?: number;
  isoWeekKey: string;
}): Promise<void> {
  const weekday = options.weekday ?? 0;
  const last = readJson<{ isoWeekKey: string; hour: number; weekday: number }>(
    STORAGE_KEYS.CALM_HOUR_SCHEDULE,
  );
  if (
    last?.isoWeekKey === options.isoWeekKey &&
    last.hour === options.hour &&
    last.weekday === weekday
  ) {
    return;
  }

  const title = 'QUM — Calm hour';
  const body = 'Take 5 minutes for a calm-hour check-in.';

  if (isNativeApp()) {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    await LocalNotifications.cancel({
      notifications: [{ id: CALM_HOUR_NOTIFICATION_ID }],
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: CALM_HOUR_NOTIFICATION_ID,
          title,
          body,
          extra: { route: 'calm-hour' },
          schedule: {
            on: {
              weekday: toCapacitorWeekday(weekday),
              hour: options.hour,
              minute: 0,
            },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    });

    writeJson(STORAGE_KEYS.CALM_HOUR_SCHEDULE, {
      isoWeekKey: options.isoWeekKey,
      hour: options.hour,
      weekday,
      channel: 'native',
    });
    return;
  }

  writeJson(STORAGE_KEYS.CALM_HOUR_SCHEDULE, {
    isoWeekKey: options.isoWeekKey,
    hour: options.hour,
    weekday,
    channel: 'web',
    note: 'Weekly calm-hour uses native notifications on device builds.',
  });
}
