const KEYBOARD_SMASH =
  /^(asdf|qwer|zxcv|hjkl|fdsa|rewq|vcxz|lkjh|aaaa|bbbb|cccc|dddd|eeee|testtest|lololol)+$/i;

const REPETITIVE = /(.)\1{4,}/;

const LIST_TASK_PATTERN =
  /\b(list|name|type|write|countries|animals|objects|items|things)\b/i;

export interface TextPreflightResult {
  ok: boolean;
  reason: string;
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;|\n]+/)
    .map((w) => w.replace(/[^\w'-]/g, ''))
    .filter((w) => w.length >= 2);
}

function parseRequiredItemCount(taskPrompt: string): number | null {
  const match = taskPrompt.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return n >= 3 && n <= 30 ? n : null;
}

function isListStyleAnswer(text: string, words: string[]): boolean {
  if (words.length >= 4) return true;
  if (text.includes(',')) return true;
  if (/^\s*\d+[\.\):]/m.test(text)) return true;
  return false;
}

export function runTextPreflight(text: string, taskPrompt = ''): TextPreflightResult {
  const trimmed = text.trim();

  if (trimmed.length < 15) {
    return { ok: false, reason: 'Answer must be at least 15 characters.' };
  }

  if (REPETITIVE.test(trimmed)) {
    return { ok: false, reason: 'Repetitive input detected. Put in real effort.' };
  }

  const normalized = trimmed.replace(/\s+/g, '').toLowerCase();
  if (KEYBOARD_SMASH.test(normalized)) {
    return { ok: false, reason: 'Keyboard smash detected. Answer the task honestly.' };
  }

  const words = extractWords(trimmed);
  const uniqueWords = new Set(words);
  const listTask = LIST_TASK_PATTERN.test(taskPrompt);
  const listAnswer = isListStyleAnswer(trimmed, words);

  if (listTask || listAnswer) {
    const required = parseRequiredItemCount(taskPrompt);
    const minItems = required ? Math.max(3, Math.ceil(required * 0.6)) : 3;

    if (uniqueWords.size < minItems) {
      return {
        ok: false,
        reason: required
          ? `List at least ${minItems} distinct items (task asks for ${required}).`
          : 'Add more distinct items — comma-separated or one per line.',
      };
    }

    return { ok: true, reason: 'Preflight passed' };
  }

  const uniqueCharRatio = new Set(normalized.split('')).size / normalized.length;
  if (uniqueCharRatio < 0.2 && normalized.length > 30) {
    return { ok: false, reason: 'Too little variety in your answer.' };
  }

  return { ok: true, reason: 'Preflight passed' };
}

/** Stricter checks when AI edge function is unavailable (e.g. Android offline). */
export function runStrictTextValidation(
  text: string,
  taskPrompt: string,
): TextPreflightResult {
  const base = runTextPreflight(text, taskPrompt);
  if (!base.ok) return base;

  const trimmed = text.trim();
  const words = extractWords(trimmed);
  const uniqueWords = new Set(words);
  const required = parseRequiredItemCount(taskPrompt);
  const listTask = LIST_TASK_PATTERN.test(taskPrompt) || isListStyleAnswer(trimmed, words);

  if (listTask && required) {
    const minItems = Math.max(3, Math.ceil(required * 0.85));
    if (uniqueWords.size < minItems) {
      return {
        ok: false,
        reason: `Offline check: list at least ${minItems} distinct items (task asks for ${required}).`,
      };
    }
    return { ok: true, reason: 'Strict list validation passed' };
  }

  if (trimmed.length < 40 || uniqueWords.size < 8) {
    return {
      ok: false,
      reason: 'Answer too short for verification without AI. Add more detail or connect to the internet.',
    };
  }

  return { ok: true, reason: 'Strict validation passed' };
}
