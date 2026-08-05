import { useCallback, useEffect, useState } from 'react';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { getIsoWeekKey } from '@/lib/calm/calmHourWeek';
import {
  computeCalmHourStreak,
  fetchCalmHourSessions,
  getLastCompletedAt,
  isCalmHourDue,
} from '@/services/calmHourService';

export function useCalmHour(userId: string | null) {
  const [streak, setStreak] = useState(0);
  const [due, setDue] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStreak(0);
      setDue(false);
      setCardVisible(false);
      return;
    }

    setLoading(true);
    const sessions = await fetchCalmHourSessions(userId);
    const lastAt = getLastCompletedAt(sessions);
    const isDue = isCalmHourDue(lastAt);
    setStreak(computeCalmHourStreak(sessions));
    setDue(isDue);

    const dismissWeek = readJson<{ week: string }>(STORAGE_KEYS.CALM_HOUR_CARD_DISMISS)?.week;
    const thisWeek = getIsoWeekKey();
    setCardVisible(isDue && dismissWeek !== thisWeek);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismissCard = useCallback(() => {
    writeJson(STORAGE_KEYS.CALM_HOUR_CARD_DISMISS, { week: getIsoWeekKey() });
    setCardVisible(false);
  }, []);

  return {
    streak,
    due,
    cardVisible,
    loading,
    refresh,
    dismissCard,
  };
}
