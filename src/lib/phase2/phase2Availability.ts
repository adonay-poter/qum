import type { Letter } from '@/types/letter';
import type { Profile } from '@/types/database';

export type Phase2ChoiceOption = 'letter' | 'voice' | 'cognitive';

export interface Phase2Availability {
  letter: boolean;
  voice: boolean;
  cognitive: true;
  /** Enabled choices excluding cognitive (letter and/or voice). */
  artifactOptionCount: number;
  /** Total enabled choices (1–3). */
  enabledCount: number;
}

export function hasUsableLetter(letter: Letter | null | undefined): boolean {
  return Boolean(letter?.body?.trim());
}

export function hasUsableVoiceMemo(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.voice_memo_path && profile.voice_memo_in_wave_enabled);
}

/** Which Phase 2 cards are available right now (reads fresh store state at call time). */
export function getPhase2Availability(
  letter: Letter | null | undefined,
  profile: Profile | null | undefined,
): Phase2Availability {
  const letterOk = hasUsableLetter(letter);
  const voiceOk = hasUsableVoiceMemo(profile);
  const artifactOptionCount = (letterOk ? 1 : 0) + (voiceOk ? 1 : 0);
  return {
    letter: letterOk,
    voice: voiceOk,
    cognitive: true,
    artifactOptionCount,
    enabledCount: artifactOptionCount + 1,
  };
}

export function choiceToVariant(
  option: Phase2ChoiceOption,
): 'letter' | 'voice_memo' | 'cognitive' {
  if (option === 'voice') return 'voice_memo';
  return option;
}

export function variantToChoice(
  variant: 'letter' | 'voice_memo' | 'cognitive',
): Phase2ChoiceOption {
  if (variant === 'voice_memo') return 'voice';
  return variant;
}
