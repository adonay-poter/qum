import { useEffect } from 'react';
import { onConnectivityChange } from '@/lib/network/connectivity';
import { flushSyncQueue } from '@/services/syncQueueService';
import { flushReflectionsOutbox } from '@/services/reflectionService';
import { refreshTaskCache } from '@/repositories/taskRepository';
import { useLetterStore } from '@/stores/letterStore';

export function useOfflineSync(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    void refreshTaskCache();
    void flushSyncQueue();
    void flushReflectionsOutbox();
    void useLetterStore.getState().load(userId, { force: true });

    return onConnectivityChange((online) => {
      if (online) {
        void refreshTaskCache().then(async () => {
          await flushSyncQueue();
          await flushReflectionsOutbox();
          await useLetterStore.getState().load(userId, { force: true });
        });
      }
    });
  }, [userId]);
}
