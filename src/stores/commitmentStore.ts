import { create } from 'zustand';
import { readJson, writeJson, remove } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { isOnline } from '@/lib/network/connectivity';
import {
  fetchCommitments,
  insertCommitment,
  updateCommitmentRemote,
} from '@/services/commitmentService';
import { trackEvent } from '@/services/telemetryService';
import { enqueue } from '@/services/syncQueueService';
import { useProfileStore } from '@/stores/profileStore';
import {
  COMMITMENT_PLEDGE_PLACEHOLDER,
  type Commitment,
  type CommitmentCreateInput,
} from '@/types/commitment';

const UPCOMING_WINDOW_MS = 6 * 60 * 60 * 1000;

interface CommitmentsCachePayload {
  userId: string;
  commitments: Commitment[];
  fetchedAt: number;
}

interface HonoredCelebration {
  commitmentId: string;
  message: string;
}

interface CommitmentStore {
  userId: string | null;
  list: Commitment[];
  hydrated: boolean;
  pendingHonoredCelebration: HonoredCelebration | null;

  hydrate: (userId: string) => void;
  load: (userId: string, options?: { force?: boolean }) => Promise<void>;
  getActive: () => Commitment | null;
  getUpcoming: () => Commitment[];
  create: (userId: string, input: CommitmentCreateInput) => Promise<Commitment | null>;
  breakCommitment: (id: string) => Promise<void>;
  finalizeExpired: () => void;
  consumeHonoredCelebration: () => HonoredCelebration | null;
  clear: () => void;
}

function readDisk(userId: string): CommitmentsCachePayload | null {
  const cached = readJson<CommitmentsCachePayload>(STORAGE_KEYS.COMMITMENTS_CACHE);
  if (!cached || cached.userId !== userId) return null;
  return cached;
}

function writeDisk(userId: string, commitments: Commitment[]): void {
  writeJson(STORAGE_KEYS.COMMITMENTS_CACHE, {
    userId,
    commitments,
    fetchedAt: Date.now(),
  } satisfies CommitmentsCachePayload);
}

function readCelebratedIds(): Set<string> {
  const ids = readJson<string[]>(STORAGE_KEYS.COMMITMENT_HONORED_CELEBRATED);
  return new Set(ids ?? []);
}

function markCelebrated(id: string): void {
  const ids = readCelebratedIds();
  ids.add(id);
  writeJson(STORAGE_KEYS.COMMITMENT_HONORED_CELEBRATED, [...ids]);
}

function formatHonoredDuration(startsAt: string, endsAt: string): string {
  const hours = Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / (60 * 60 * 1000),
  );
  if (hours <= 1) return '1 hour';
  return `${hours} hours`;
}

function isActive(c: Commitment, now = Date.now()): boolean {
  const start = new Date(c.starts_at).getTime();
  const end = new Date(c.ends_at).getTime();
  return now >= start && now < end && c.honored === null;
}

/** Pure selectors — use with `list` + useMemo in components (never in Zustand hooks directly). */
export function selectActiveCommitment(
  list: Commitment[],
  now = Date.now(),
): Commitment | null {
  const normalized = normalizeList(list);
  return normalized.find((c) => isActive(c, now)) ?? null;
}

export function selectUpcomingCommitments(
  list: Commitment[],
  now = Date.now(),
): Commitment[] {
  const normalized = normalizeList(list);
  const horizon = now + UPCOMING_WINDOW_MS;
  return normalized
    .filter((c) => {
      const start = new Date(c.starts_at).getTime();
      return start > now && start <= horizon && c.honored === null;
    })
    .sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
}

function sortByStart(a: Commitment, b: Commitment): number {
  return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
}

function normalizeList(list: unknown): Commitment[] {
  return Array.isArray(list) ? list.map(normalizeCommitment) : [];
}

function normalizeCommitment(c: Commitment): Commitment {
  return { ...c, honored: c.honored ?? null, broken_at: c.broken_at ?? null };
}

export const useCommitmentStore = create<CommitmentStore>((set, get) => ({
  userId: null,
  list: [],
  hydrated: false,
  pendingHonoredCelebration: null,

  hydrate: (userId) => {
    const disk = readDisk(userId);
    if (!disk) {
      set({ userId, list: [], hydrated: true });
      return;
    }
    const list = normalizeList(disk.commitments);
    set({ userId, list, hydrated: true });
    get().finalizeExpired();
  },

  load: async (userId, options) => {
    if (get().userId !== userId) get().hydrate(userId);

    if (!options?.force && get().list.length > 0 && get().userId === userId) {
      get().finalizeExpired();
      return;
    }

    if (isOnline()) {
      const remote = await fetchCommitments(userId);
      set({ userId, list: remote.sort(sortByStart), hydrated: true });
      writeDisk(userId, remote);
      get().finalizeExpired();
      return;
    }

    get().finalizeExpired();
  },

  getActive: () => selectActiveCommitment(get().list),

  getUpcoming: () => selectUpcomingCommitments(get().list),

  create: async (userId, input) => {
    const now = new Date();
    const ends = new Date(now.getTime() + input.durationHours * 60 * 60 * 1000);
    const id = crypto.randomUUID();
    const clientCreatedAt = now.toISOString();

    const draft: Commitment = {
      id,
      user_id: userId,
      pledge: input.pledge.trim() || COMMITMENT_PLEDGE_PLACEHOLDER.slice(0, 240),
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      honored: null,
      broken_at: null,
      created_at: clientCreatedAt,
      client_created_at: clientCreatedAt,
      synced: false,
    };

    let saved = draft;
    if (isOnline()) {
      const remote = await insertCommitment(userId, {
        id,
        pledge: draft.pledge,
        starts_at: draft.starts_at,
        ends_at: draft.ends_at,
        client_created_at: clientCreatedAt,
      });
      if (remote) saved = remote;
    } else {
      enqueue({
        type: 'commitment_create',
        userId,
        commitment: saved,
      });
    }

    const next = [saved, ...normalizeList(get().list)].sort(sortByStart);
    set({ userId, list: next, hydrated: true });
    writeDisk(userId, next);
    trackEvent('commitment_created', { hours: input.durationHours });
    return saved;
  },

  breakCommitment: async (id) => {
    const current = get().list.find((c) => c.id === id);
    if (!current || !isActive(current)) return;

    const durationRemainingMs = Math.max(
      0,
      new Date(current.ends_at).getTime() - Date.now(),
    );
    const broken_at = new Date().toISOString();
    const updated: Commitment = { ...current, honored: false, broken_at };
    const list = get().list.map((c) => (c.id === id ? updated : c));
    set({ list });
    if (get().userId) writeDisk(get().userId!, list);

    if (isOnline()) {
      await updateCommitmentRemote(id, { honored: false, broken_at });
    } else {
      enqueue({ type: 'commitment_update', id, patch: { honored: false, broken_at } });
    }

    trackEvent('commitment_broken_manual', {
      duration_remaining_ms: durationRemainingMs,
    });

    if (get().userId) {
      void useProfileStore.getState().recomputeResilience(get().userId!);
    }
  },

  finalizeExpired: () => {
    const current = normalizeList(get().list);
    const celebrated = readCelebratedIds();

    const now = Date.now();
    let changed = false;
    let celebration: HonoredCelebration | null = null;
    const list = current.map((c) => {
      if (c.honored !== null) return c;
      if (new Date(c.ends_at).getTime() >= now) return c;
      changed = true;
      const durationTotalMs =
        new Date(c.ends_at).getTime() - new Date(c.starts_at).getTime();
      if (isOnline()) void updateCommitmentRemote(c.id, { honored: true });
      else enqueue({ type: 'commitment_update', id: c.id, patch: { honored: true } });
      trackEvent('commitment_completed_honored', {
        duration_total_ms: durationTotalMs,
      });
      if (!celebrated.has(c.id) && !celebration) {
        const label = formatHonoredDuration(c.starts_at, c.ends_at);
        celebration = {
          commitmentId: c.id,
          message: `You held the line for ${label}. That counts.`,
        };
        markCelebrated(c.id);
      }
      return { ...c, honored: true };
    });

    if (changed || current !== get().list) {
      set({
        list,
        ...(celebration ? { pendingHonoredCelebration: celebration } : {}),
      });
      if (get().userId) writeDisk(get().userId!, list);
    }
  },

  consumeHonoredCelebration: () => {
    const pending = get().pendingHonoredCelebration;
    if (!pending) return null;
    set({ pendingHonoredCelebration: null });
    return pending;
  },

  clear: () => {
    remove(STORAGE_KEYS.COMMITMENTS_CACHE);
    set({ userId: null, list: [], hydrated: false, pendingHonoredCelebration: null });
  },
}));
