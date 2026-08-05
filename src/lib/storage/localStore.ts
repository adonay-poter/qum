import { readRaw, removeRaw, writeRaw } from '@/lib/storage/appStorage';

export function readJson<T>(key: string): T | null {
  try {
    const raw = readRaw(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T): void {
  writeRaw(key, JSON.stringify(value));
}

export function remove(key: string): void {
  removeRaw(key);
}
