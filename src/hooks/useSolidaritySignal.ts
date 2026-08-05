import { useCallback, useEffect, useRef, useState } from 'react';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import {
  fetchSolidarityHourly,
  fetchSolidaritySummary,
  type SolidarityHourlyPoint,
} from '@/services/solidarityService';

const POLL_MS = 30_000;

export interface SolidarityCache {
  activeNow: number;
  surfsToday: number;
  hourly: SolidarityHourlyPoint[];
  fetchedAt: number;
}

function readCache(): SolidarityCache | null {
  return readJson<SolidarityCache>(STORAGE_KEYS.SOLIDARITY_CACHE);
}

function writeCache(payload: SolidarityCache): void {
  writeJson(STORAGE_KEYS.SOLIDARITY_CACHE, payload);
}

export function useSolidaritySignal(visible: boolean) {
  const cached = readCache();
  const [activeNow, setActiveNow] = useState(cached?.activeNow ?? 0);
  const [surfsToday, setSurfsToday] = useState(cached?.surfsToday ?? 0);
  const [hourly, setHourly] = useState<SolidarityHourlyPoint[]>(cached?.hourly ?? []);
  const [loading, setLoading] = useState(!cached);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const [summary, hourlyData] = await Promise.all([
      fetchSolidaritySummary(),
      fetchSolidarityHourly(),
    ]);

    const nextActive = summary?.activeNow ?? 0;
    const nextToday = summary?.surfsToday ?? 0;
    const nextHourly = hourlyData;

    setActiveNow(nextActive);
    setSurfsToday(nextToday);
    setHourly(nextHourly);
    setLoading(false);

    writeCache({
      activeNow: nextActive,
      surfsToday: nextToday,
      hourly: nextHourly,
      fetchedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    void refresh();
    intervalRef.current = setInterval(() => void refresh(), POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [visible, refresh]);

  return { activeNow, surfsToday, hourly, loading, refresh };
}
