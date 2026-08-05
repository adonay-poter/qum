import raw from '@/lib/crisis/hotlines.json';

export interface HotlineEntry {
  id: string;
  label: string;
  description: string;
  phone?: string;
  url: string;
  tags: string[];
  regions: string[];
}

interface HotlinesFile {
  verifiedAt: string;
  entries: HotlineEntry[];
  addictionTypes: Record<string, string[]>;
}

const data = raw as HotlinesFile;
const byId = new Map(data.entries.map((e) => [e.id, e]));

function resolveIds(ids: string[]): HotlineEntry[] {
  const seen = new Set<string>();
  const out: HotlineEntry[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const entry = byId.get(id);
    if (entry) {
      seen.add(id);
      out.push(entry);
    }
  }
  return out;
}

export function getHotlinesForAddiction(
  addictionType: string | null | undefined,
  options?: { includeCrisisExtras?: boolean },
): HotlineEntry[] {
  const key =
    addictionType && addictionType in data.addictionTypes
      ? addictionType
      : 'default';
  const ids = [...(data.addictionTypes[key] ?? data.addictionTypes.default)];

  if (options?.includeCrisisExtras && !ids.includes('find_a_helpline')) {
    ids.push('find_a_helpline');
  }

  if (key === 'default' && !ids.includes('samaritans_uk')) {
    ids.push('samaritans_uk');
  }

  return resolveIds(ids);
}

export function formatPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits}`;
}

export function psychologyTodayTherapistUrl(locale?: string): string {
  const lang = (locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US')).toLowerCase();
  if (lang.startsWith('en-ca')) {
    return 'https://www.psychologytoday.com/ca/therapists';
  }
  if (lang.startsWith('en-gb') || lang.startsWith('en-uk')) {
    return 'https://www.psychologytoday.com/gb/counselling';
  }
  return 'https://www.psychologytoday.com/us/therapists';
}

export const hotlinesVerifiedAt = data.verifiedAt;
