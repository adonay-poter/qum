import { create } from 'zustand';
import { remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { getLetter, saveLetter as persistLetter } from '@/services/letterService';
import { trackEvent } from '@/services/telemetryService';
import type { Letter } from '@/types/letter';

interface LetterStore {
  userId: string | null;
  letter: Letter | null;
  hydrated: boolean;

  hydrate: (userId: string) => void;
  load: (userId: string, options?: { force?: boolean }) => Promise<Letter | null>;
  save: (userId: string, body: string) => Promise<Letter | null>;
  clear: () => void;
}

export const useLetterStore = create<LetterStore>((set, get) => ({
  userId: null,
  letter: null,
  hydrated: false,

  hydrate: (userId) => {
    set({ userId, hydrated: true });
    void get()
      .load(userId)
      .catch((err) => console.error('letter hydrate load', err));
  },

  load: async (userId, options) => {
    if (get().userId !== userId) {
      set({ userId, hydrated: true });
    }

    if (!options?.force && get().hydrated && get().userId === userId) {
      return get().letter;
    }

    const remote = await getLetter(userId);
    set({ userId, letter: remote, hydrated: true });
    return remote;
  },

  save: async (userId, body) => {
    const trimmed = body.trim();
    if (!trimmed) return null;

    const hadLetter = Boolean(get().letter?.body);
    const saved = await persistLetter(userId, trimmed);
    set({ userId, letter: saved, hydrated: true });

    trackEvent(hadLetter ? 'letter_updated' : 'letter_created', {
      character_count: trimmed.length,
    });

    return saved;
  },

  clear: () => {
    remove(STORAGE_KEYS.LETTER_CACHE);
    set({ userId: null, letter: null, hydrated: false });
  },
}));
