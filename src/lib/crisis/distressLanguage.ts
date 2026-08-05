/**
 * Short, audited substring list for client-side distress detection only.
 * Never transmitted to servers. Prefer false negatives over noisy alerts.
 */
export const DISTRESS_PHRASES: readonly string[] = [
  'want to die',
  'wish i was dead',
  'kill myself',
  'killing myself',
  'end my life',
  'end it all',
  'suicide',
  'suicidal',
  'self-harm',
  'self harm',
  'hurt myself',
  'harm myself',
  'better off dead',
  "can't go on",
  'no point living',
  "don't want to be here",
  'give up on life',
] as const;

export function normalizeDistressText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function containsDistressLanguage(text: string): boolean {
  const normalized = normalizeDistressText(text);
  if (!normalized) return false;
  return DISTRESS_PHRASES.some((phrase) => normalized.includes(phrase));
}
