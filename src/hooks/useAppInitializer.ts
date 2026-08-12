import { useEffect, useState } from 'react';
import { useWaveStore } from '@/stores/waveStore';
import { useProfileStore } from '@/stores/profileStore';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { useLetterStore } from '@/stores/letterStore';

export function useAppInitializer(userId?: string | null) {
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfileReady(false);
      useLetterStore.getState().clear();
      return;
    }

    let cancelled = false;
    setProfileReady(false);

    // Fallback: Ensure PWA never hangs on loading screen if network profile load stalls
    const timeout = setTimeout(() => {
      if (!cancelled) setProfileReady(true);
    }, 3500);

    try {
      useWaveStore.getState().hydrate();
      useCommitmentStore.getState().hydrate(userId);
      void useCommitmentStore.getState().load(userId);
      useLetterStore.getState().hydrate(userId);
    } catch (err) {
      console.error('State store hydration error:', err);
      useCommitmentStore.getState().clear();
      useLetterStore.getState().clear();
    }

    void useProfileStore
      .getState()
      .loadProfile(userId, { force: true })
      .catch((err) => console.error('loadProfile failed:', err))
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setProfileReady(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [userId]);

  return { profileReady };
}
