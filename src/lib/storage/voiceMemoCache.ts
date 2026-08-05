import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { readBlob, removeBlob, writeBlob } from '@/lib/storage/blobStore';

const CACHE_TTL_MS = 60 * 60 * 1000;

export interface VoiceMemoCacheMeta {
  userId: string;
  fetchedAt: number;
  durationMs: number | null;
  mimeType: string;
}

type VoiceMemoCacheIndex = Record<string, VoiceMemoCacheMeta>;

function blobKey(userId: string): string {
  return `voice-memo:${userId}`;
}

function readIndex(): VoiceMemoCacheIndex {
  return readJson<VoiceMemoCacheIndex>(STORAGE_KEYS.VOICE_MEMO_CACHE) ?? {};
}

function writeIndex(index: VoiceMemoCacheIndex): void {
  writeJson(STORAGE_KEYS.VOICE_MEMO_CACHE, index);
}

function isFresh(meta: VoiceMemoCacheMeta): boolean {
  return Date.now() - meta.fetchedAt < CACHE_TTL_MS;
}

export async function getCachedVoiceMemoBlob(
  userId: string,
): Promise<{ blob: Blob; meta: VoiceMemoCacheMeta } | null> {
  const index = readIndex();
  const meta = index[userId];
  if (!meta || !isFresh(meta)) return null;

  const blob = await readBlob(blobKey(userId));
  if (!blob) return null;

  return { blob, meta };
}

export async function cacheVoiceMemoBlob(
  userId: string,
  blob: Blob,
  meta: Omit<VoiceMemoCacheMeta, 'userId' | 'fetchedAt'> & { durationMs?: number | null },
): Promise<VoiceMemoCacheMeta> {
  const entry: VoiceMemoCacheMeta = {
    userId,
    fetchedAt: Date.now(),
    durationMs: meta.durationMs ?? null,
    mimeType: meta.mimeType,
  };

  await writeBlob(blobKey(userId), blob);
  const index = readIndex();
  index[userId] = entry;
  writeIndex(index);
  return entry;
}

export async function invalidateVoiceMemoCache(userId: string): Promise<void> {
  const index = readIndex();
  delete index[userId];
  writeIndex(index);
  await removeBlob(blobKey(userId));
}
