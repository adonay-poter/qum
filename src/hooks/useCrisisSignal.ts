import { useCallback, useEffect, useRef, useState } from 'react';
import { detectCrisisSignal, type CrisisSeverity } from '@/lib/crisis/signalDetector';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { fetchReflections } from '@/services/reflectionService';
import { trackEvent } from '@/services/telemetryService';
import { fetchWavesLog } from '@/services/waveService';

const DISMISS_MS = 48 * 60 * 60 * 1000;
const REFLECTION_LOOKBACK_DAYS = 90;

interface CrisisDismissState {
  until: string;
}

export function useCrisisSignal(userId: string | null) {
  const [severity, setSeverity] = useState<CrisisSeverity | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [distressLanguageDetected, setDistressLanguageDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const shownRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSeverity(null);
      setCardVisible(false);
      setDistressLanguageDetected(false);
      return;
    }

    setLoading(true);
    const since = new Date(
      Date.now() - REFLECTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const [waves, reflections] = await Promise.all([
      fetchWavesLog(userId),
      fetchReflections(userId, since),
    ]);

    const result = detectCrisisSignal(waves, reflections);
    const dismiss = readJson<CrisisDismissState>(STORAGE_KEYS.CRISIS_CARD_DISMISS);
    const dismissed =
      dismiss?.until != null && new Date(dismiss.until).getTime() > Date.now();

    setSeverity(result.severity);
    setDistressLanguageDetected(result.distressLanguageDetected);
    setCardVisible(result.showCrisisCard && !dismissed);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!cardVisible || !severity) {
      shownRef.current = false;
      return;
    }
    if (shownRef.current) return;
    shownRef.current = true;
    trackEvent('crisis_card_shown', { severity });
  }, [cardVisible, severity]);

  const dismissCard = useCallback(() => {
    const until = new Date(Date.now() + DISMISS_MS).toISOString();
    writeJson(STORAGE_KEYS.CRISIS_CARD_DISMISS, { until });
    setCardVisible(false);
  }, []);

  return {
    severity,
    cardVisible,
    distressLanguageDetected,
    loading,
    refresh,
    dismissCard,
  };
}
