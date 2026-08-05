import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';

export function useProfile(userId: string | null) {
  const profile = useProfileStore((s) => s.profile);
  const isRefreshing = useProfileStore((s) => s.isRefreshing);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  useEffect(() => {
    if (!userId) return;
    void loadProfile(userId);
  }, [userId, loadProfile]);

  return { profile, isRefreshing, refresh: () => (userId ? loadProfile(userId, { force: true }) : null) };
}
