import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/platform/native';
import { STORAGE_KEYS } from '@/lib/storage/keys';

const ALL_KEYS = Object.values(STORAGE_KEYS);
const memory = new Map<string, string>();
let ready = false;

async function persistKey(key: string, value: string | null): Promise<void> {
  if (!isNativeApp()) {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }

  if (value === null) await Preferences.remove({ key });
  else await Preferences.set({ key, value });
}

export async function initAppStorage(): Promise<void> {
  if (ready) return;

  if (isNativeApp()) {
    for (const key of ALL_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        memory.set(key, value);
        continue;
      }
      const legacy = localStorage.getItem(key);
      if (legacy !== null) {
        memory.set(key, legacy);
        await Preferences.set({ key, value: legacy });
      }
    }
  } else {
    for (const key of ALL_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy !== null) memory.set(key, legacy);
    }
  }

  ready = true;
}

export function readRaw(key: string): string | null {
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  void persistKey(key, value);
}

export function removeRaw(key: string): void {
  memory.delete(key);
  void persistKey(key, null);
}

export { readBlob, writeBlob, removeBlob } from '@/lib/storage/blobStore';
export {
  getCachedVoiceMemoBlob,
  cacheVoiceMemoBlob,
  invalidateVoiceMemoCache,
} from '@/lib/storage/voiceMemoCache';
