import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';

export function isLetterStartersDismissed(): boolean {
  return readJson<boolean>(STORAGE_KEYS.LETTER_STARTERS_DISMISSED) === true;
}

export function dismissLetterStarters(): void {
  writeJson(STORAGE_KEYS.LETTER_STARTERS_DISMISSED, true);
}

export function getLetterStarterPickCount(): number {
  const n = readJson<number>(STORAGE_KEYS.LETTER_STARTER_PICK_COUNT);
  return typeof n === 'number' && n >= 0 ? n : 0;
}

export function recordLetterStarterPick(): number {
  const next = getLetterStarterPickCount() + 1;
  writeJson(STORAGE_KEYS.LETTER_STARTER_PICK_COUNT, next);
  return next;
}
