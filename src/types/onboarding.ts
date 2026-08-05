export const ADDICTION_TYPES = [
  { id: 'doomscroll', label: 'Doomscrolling' },
  { id: 'porn', label: 'Porn' },
  { id: 'gambling', label: 'Gambling' },
  { id: 'food', label: 'Food / binge eating' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'nicotine', label: 'Nicotine' },
  { id: 'cannabis', label: 'Cannabis' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
] as const;

export type AddictionType = (typeof ADDICTION_TYPES)[number]['id'];

export interface OnboardingData {
  addiction_type: AddictionType;
  addiction_type_other: string | null;
  peak_danger_hour: number;
  physical_baseline: number;
  north_star: string | null;
  voice_memo_path: string | null;
  voice_memo_in_wave_enabled: boolean;
}

export const NORTH_STAR_OPTIONS = [
  { id: 'mental_clarity', label: 'Mental Clarity' },
  { id: 'time_sovereignty', label: 'Time Sovereignty' },
  { id: 'physical_freedom', label: 'Physical Freedom' },
] as const;

export type NorthStarId = (typeof NORTH_STAR_OPTIONS)[number]['id'];

export function northStarLabel(id: NorthStarId): string {
  return NORTH_STAR_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function addictionTypeLabel(id: AddictionType): string {
  return ADDICTION_TYPES.find((o) => o.id === id)?.label ?? id;
}
