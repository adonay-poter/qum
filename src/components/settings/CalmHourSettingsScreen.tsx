import { useState } from 'react';
import { Page } from '@/components/layout/Page';
import { computeCalmHour, extractHourFromIso } from '@/lib/calm/computeCalmHour';
import { getIsoWeekKey } from '@/lib/calm/calmHourWeek';
import { readCalmHourPrefs, writeCalmHourPrefs } from '@/lib/storage/calmHourPrefs';
import { fetchReflections } from '@/services/reflectionService';
import { scheduleCalmHourCheckIn } from '@/services/notificationService';
import { fetchWavesLog } from '@/services/waveService';
import { useProfileStore } from '@/stores/profileStore';

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

interface CalmHourSettingsScreenProps {
  userId: string;
  onDone: () => void;
}

export function CalmHourSettingsScreen({ userId, onDone }: CalmHourSettingsScreenProps) {
  const profile = useProfileStore((s) => s.profile);
  const initial = readCalmHourPrefs();
  const [weekday, setWeekday] = useState(initial.weekday);
  const [hour, setHour] = useState(initial.hour ?? 10);
  const [useAutoHour, setUseAutoHour] = useState(initial.hour === null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    writeCalmHourPrefs({ weekday, hour: useAutoHour ? null : hour });

    let scheduleHour = hour;
    if (useAutoHour) {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const [waves, slips] = await Promise.all([
        fetchWavesLog(userId),
        fetchReflections(userId, since),
      ]);
      const eventHours = [
        ...waves.map((w) => extractHourFromIso(w.started_at)),
        ...slips.map((s) => extractHourFromIso(s.occurred_at)),
      ];
      scheduleHour = computeCalmHour({
        eventHours,
        peakDangerHour: profile?.peak_danger_hour ?? null,
      });
    }

    await scheduleCalmHourCheckIn({
      hour: scheduleHour,
      weekday,
      isoWeekKey: getIsoWeekKey(),
    });
    setBusy(false);
    setSaved(true);
  };

  return (
    <Page>
      <div className="flex h-full min-h-0 flex-col py-4">
        <button
          type="button"
          onClick={onDone}
          aria-label="Back to settings"
          className="self-start px-2 py-1 text-label uppercase text-secondary"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-h1 text-primary">Calm-hour reminder</h1>
        <p className="mt-2 text-body text-secondary">
          A gentle weekly check-in outside urge moments.
        </p>

        <label className="mt-6 block text-label uppercase text-secondary" htmlFor="calm-weekday">
          Day of week
        </label>
        <select
          id="calm-weekday"
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          className="mt-2 w-full border border-secondary/30 bg-surface px-3 py-3 text-body text-primary"
        >
          {WEEKDAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <label className="mt-6 flex items-center gap-2 text-body text-primary">
          <input
            type="checkbox"
            checked={useAutoHour}
            onChange={(e) => setUseAutoHour(e.target.checked)}
            aria-label="Use calmest hour from my activity"
          />
          Use calmest hour from my activity
        </label>

        {!useAutoHour && (
          <>
            <label className="mt-4 block text-label uppercase text-secondary" htmlFor="calm-hour">
              Time ({hour}:00)
            </label>
            <input
              id="calm-hour"
              type="range"
              min={7}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              aria-valuemin={7}
              aria-valuemax={23}
              aria-valuenow={hour}
              aria-label="Calm-hour reminder time"
              className="mt-2 w-full"
            />
          </>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          aria-label="Save calm-hour reminder settings"
          className="mt-8 w-full border border-secondary/40 py-4 text-body text-primary disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>

        {saved && (
          <p className="mt-3 text-center text-body text-secondary" role="status">
            Saved. Your next reminder will use these settings.
          </p>
        )}
      </div>
    </Page>
  );
}
