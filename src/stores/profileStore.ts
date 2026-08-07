import { create } from 'zustand';
import { readJson, writeJson, remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { fetchProfile, persistOnboarding } from '@/services/profileService';
import { scheduleUrgeWarning } from '@/services/notificationService';
import { fetchResilienceEvents } from '@/services/resilienceEventsService';
import {
  computeResilienceLocal,
  recomputeResilienceRemote,
} from '@/services/resilienceService';
import { normalizeProfile } from '@/lib/profileStats';
import type { Profile } from '@/types/database';
import type { OnboardingData } from '@/types/onboarding';

const CACHE_TTL_MS = 10 * 60 * 1000;

interface ProfileCachePayload {
  userId: string;
  profile: Profile;
  fetchedAt: number;
}

interface ProfileStore {
  userId: string | null;
  profile: Profile | null;
  lastFetchedAt: number | null;
  isRefreshing: boolean;

  hydrate: (userId: string) => void;
  loadProfile: (userId: string, options?: { force?: boolean }) => Promise<Profile | null>;
  setProfile: (profile: Profile | null) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: (payload: OnboardingData) => Promise<{ ok: boolean; error?: string }>;
  /** Recompute resilience from the 30-day window; returns new level. */
  recomputeResilience: (userId: string) => Promise<number | null>;
  clear: () => void;
}

function readDiskCache(userId: string): ProfileCachePayload | null {
  const cached = readJson<ProfileCachePayload>(STORAGE_KEYS.PROFILE_CACHE);
  if (!cached || cached.userId !== userId) return null;
  return cached;
}

function writeDiskCache(userId: string, profile: Profile): void {
  writeJson(STORAGE_KEYS.PROFILE_CACHE, {
    userId,
    profile,
    fetchedAt: Date.now(),
  } satisfies ProfileCachePayload);
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  userId: null,
  profile: null,
  lastFetchedAt: null,
  isRefreshing: false,

  hydrate: (userId) => {
    const disk = readDiskCache(userId);
    if (!disk?.profile || typeof disk.profile !== 'object') return;
    const profile = normalizeProfile(disk.profile);
    set({
      userId,
      profile,
      lastFetchedAt: disk.fetchedAt,
    });
    void get().recomputeResilience(userId);
  },

  setProfile: (profile) => {
    const normalized = profile ? normalizeProfile(profile) : null;
    const userId = normalized?.id ?? null;
    if (normalized && userId) {
      writeDiskCache(userId, normalized);
    }
    set({
      profile: normalized,
      userId,
      lastFetchedAt: normalized ? Date.now() : null,
    });
  },

  patchProfile: (patch) => {
    const current = get().profile;
    if (!current) return;
    get().setProfile({ ...current, ...patch });
  },

  completeOnboarding: async (payload) => {
    const userId = get().userId;
    if (!userId) {
      return { ok: false, error: 'Not signed in' };
    }

    const { profile, error } = await persistOnboarding(userId, payload);
    if (error || !profile) {
      return { ok: false, error: error?.message ?? 'Failed to save onboarding' };
    }

    get().setProfile(profile);
    void scheduleUrgeWarning(payload.peak_danger_hour);

    return { ok: true };
  },

  recomputeResilience: async (userId) => {
    const current = get().profile;
    const previous = current?.resilience_level ?? 50;

    const remote = await recomputeResilienceRemote(userId);
    if (remote !== null) {
      if (current && current.id === userId) {
        get().patchProfile({ resilience_level: remote });
      }
      return remote;
    }

    const events = await fetchResilienceEvents(userId);
    const computed = computeResilienceLocal(events, previous);
    if (current && current.id === userId) {
      get().patchProfile({ resilience_level: computed });
    }
    return computed;
  },

  clear: () => {
    remove(STORAGE_KEYS.PROFILE_CACHE);
    set({
      userId: null,
      profile: null,
      lastFetchedAt: null,
      isRefreshing: false,
    });
  },

  loadProfile: async (userId, options) => {
    const force = options?.force ?? false;
    const state = get();

    if (state.userId !== userId) {
      get().hydrate(userId);
    }

    const cached = get().profile;
    const fetchedAt = get().lastFetchedAt;
    const isFresh =
      cached &&
      get().userId === userId &&
      fetchedAt !== null &&
      Date.now() - fetchedAt < CACHE_TTL_MS;

    if (!force && isFresh) {
      void get().recomputeResilience(userId);
      return cached;
    }

    if (!force && cached && get().userId === userId) {
      if (!get().isRefreshing) {
        set({ isRefreshing: true });
        void get()
          .loadProfile(userId, { force: true })
          .finally(() => set({ isRefreshing: false }));
      }
      void get().recomputeResilience(userId);
      return cached;
    }

    const remote = await fetchProfile(userId);
    if (remote) {
      get().setProfile(remote);
      set({ userId });
      await get().recomputeResilience(userId);
      return get().profile;
    }

    const ensured = await ensureProfile(userId);
    if (ensured) {
      get().setProfile(ensured);
      set({ userId });
      await get().recomputeResilience(userId);
      return get().profile;
    }

    return null;
  },
}));
