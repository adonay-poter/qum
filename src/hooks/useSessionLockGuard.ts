import { useEffect, useState } from 'react';
import {
  consumeRageQuitNotice,
  evaluateSessionLockOnBoot,
  type RageQuitResolution,
} from '@/services/rageQuitService';
import { useWaveStore } from '@/stores/waveStore';

function applyRageQuitOutcome(setShowOverlay: (show: boolean) => void): void {
  useWaveStore.getState().resetToIdle();
  useWaveStore.getState().showNeutralWaveEndToast();
  if (consumeRageQuitNotice()) {
    setShowOverlay(true);
  }
}

export function useSessionLockGuard(enabled: boolean) {
  const [checking, setChecking] = useState(enabled);
  const [resolution, setResolution] = useState<RageQuitResolution>('none');
  const [showRageQuitOverlay, setShowRageQuitOverlay] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await evaluateSessionLockOnBoot();
      if (cancelled) return;

      if (result.resolution === 'rage_quit') {
        applyRageQuitOutcome(setShowRageQuitOverlay);
      } else if (result.resolution === 'expired_clean') {
        useWaveStore.getState().resetToIdle();
      }

      setResolution(result.resolution);
      setChecking(false);
    })();

    const onFocus = () => {
      void evaluateSessionLockOnBoot().then((result) => {
        if (result.resolution === 'rage_quit') {
          applyRageQuitOutcome(setShowRageQuitOverlay);
          setResolution('rage_quit');
        }
      });
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('qum:app-resume', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('qum:app-resume', onFocus);
    };
  }, [enabled]);

  const dismissRageQuitOverlay = () => setShowRageQuitOverlay(false);

  return { checking, resolution, showRageQuitOverlay, dismissRageQuitOverlay };
}
