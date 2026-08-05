import type { PowValidationResult } from '@/types/session';

export function parsePowResponse(data: unknown): PowValidationResult | null {
  if (!data || typeof data !== 'object') return null;

  const direct = data as Record<string, unknown>;
  const normalized = normalizePow(direct);
  if (normalized) return normalized;

  const nested = (data as { data?: Record<string, unknown> }).data;
  if (nested && typeof nested === 'object') {
    const fromNested = normalizePow(nested);
    if (fromNested) return fromNested;
  }

  const err = direct.error ?? direct.message;
  if (typeof err === 'string') return { isValid: false, reason: err };

  return null;
}

function normalizePow(obj: Record<string, unknown>): PowValidationResult | null {
  const isValidRaw = obj.isValid ?? obj.valid ?? obj.is_valid ?? obj.passed;
  const reasonRaw = obj.reason ?? obj.message ?? obj.explanation;

  const isValid = coerceBool(isValidRaw);
  if (isValid === null) return null;

  return {
    isValid,
    reason:
      typeof reasonRaw === 'string' && reasonRaw.trim()
        ? reasonRaw.trim()
        : isValid
          ? 'Task accepted.'
          : 'Task rejected.',
  };
}

function coerceBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(v)) return true;
    if (['false', 'no', '0'].includes(v)) return false;
  }
  return null;
}
