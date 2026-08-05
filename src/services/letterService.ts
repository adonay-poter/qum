import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/network/connectivity';
import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { enqueue, flushSyncQueue } from '@/services/syncQueueService';
import type { Letter } from '@/types/letter';

const LETTER_SELECT = 'id, user_id, body, created_at, updated_at';

interface LetterCachePayload {
  userId: string;
  letter: Letter | null;
  fetchedAt: number;
}

function readDiskCache(userId: string): Letter | null {
  const cached = readJson<LetterCachePayload>(STORAGE_KEYS.LETTER_CACHE);
  if (!cached || cached.userId !== userId) return null;
  return cached.letter;
}

function writeDiskCache(userId: string, letter: Letter | null): void {
  writeJson(STORAGE_KEYS.LETTER_CACHE, {
    userId,
    letter,
    fetchedAt: Date.now(),
  } satisfies LetterCachePayload);
}

export async function getLetter(userId: string): Promise<Letter | null> {
  const cached = readDiskCache(userId);
  if (!isOnline()) return cached;

  const { data, error } = await supabase
    .from('user_letters')
    .select(LETTER_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getLetter', error);
    return cached;
  }

  const letter = (data as Letter | null) ?? null;
  writeDiskCache(userId, letter);
  return letter;
}

export async function saveLetter(userId: string, body: string): Promise<Letter> {
  const trimmed = body.trim();
  const cached = readDiskCache(userId);
  const now = new Date().toISOString();

  const draft: Letter = {
    id: cached?.id ?? crypto.randomUUID(),
    user_id: userId,
    body: trimmed,
    created_at: cached?.created_at ?? now,
    updated_at: now,
  };

  writeDiskCache(userId, draft);

  if (isOnline()) {
    const remote = await upsertLetterRemote(draft);
    if (remote) {
      writeDiskCache(userId, remote);
      return remote;
    }
  }

  enqueue({ type: 'letter_upsert', userId, letter: draft });
  void flushSyncQueue();
  return draft;
}

async function upsertLetterRemote(letter: Letter): Promise<Letter | null> {
  const { data, error } = await supabase
    .from('user_letters')
    .upsert(
      {
        id: letter.id,
        user_id: letter.user_id,
        body: letter.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select(LETTER_SELECT)
    .single();

  if (error) {
    console.error('upsertLetterRemote', error);
    return null;
  }

  return data as Letter;
}

export async function flushLetterUpsert(
  userId: string,
  letter: Letter,
): Promise<boolean> {
  const remote = await upsertLetterRemote(letter);
  if (!remote) return false;
  writeDiskCache(userId, remote);
  return true;
}
