import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import type { ReflectionMode, ReflectionPayload } from '@/types/reflection';

export interface ReflectionOutboxItem {
  id: string;
  userId: string;
  waveId: string | null;
  mode: ReflectionMode;
  payload: ReflectionPayload;
  clientCreatedAt: string;
}

function readOutbox(): ReflectionOutboxItem[] {
  return (
    readJson<ReflectionOutboxItem[]>(STORAGE_KEYS.REFLECTIONS_OUTBOX) ??
    readJson<ReflectionOutboxItem[]>(STORAGE_KEYS.CRASH_REPORTS_OUTBOX) ??
    []
  );
}

function writeOutbox(items: ReflectionOutboxItem[]): void {
  writeJson(STORAGE_KEYS.REFLECTIONS_OUTBOX, items);
}

export function enqueueReflection(
  item: Omit<ReflectionOutboxItem, 'id'>,
  id = crypto.randomUUID(),
): string {
  writeOutbox([...readOutbox(), { ...item, id }]);
  return id;
}

export function readReflectionsOutbox(): ReflectionOutboxItem[] {
  return readOutbox();
}

export function removeReflectionOutboxItem(id: string): void {
  writeOutbox(readOutbox().filter((item) => item.id !== id));
}

/** @deprecated */
export const enqueueCrashReport = enqueueReflection;
export const readCrashReportsOutbox = readReflectionsOutbox;
export const removeCrashReportOutboxItem = removeReflectionOutboxItem;
export type CrashReportOutboxItem = ReflectionOutboxItem;
