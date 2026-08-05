export type VictoryArtifactType = 'pledge' | 'letter' | 'voice_memo';

export function pickVictoryArtifact(
  available: VictoryArtifactType[],
): VictoryArtifactType | null {
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)] ?? null;
}

export function getAvailableVictoryArtifacts(options: {
  hasPledge: boolean;
  hasLetter: boolean;
  hasVoiceMemo: boolean;
}): VictoryArtifactType[] {
  const out: VictoryArtifactType[] = [];
  if (options.hasPledge) out.push('pledge');
  if (options.hasLetter) out.push('letter');
  if (options.hasVoiceMemo) out.push('voice_memo');
  return out;
}
