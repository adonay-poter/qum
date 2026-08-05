export const GROUNDING_INSIGHTS = [
  "Your brain is statistically wired to lie to you in exactly 15 minutes. Guard your shield. Stay sharp.",
  "Peak urge window approaching. Breathe before the wave chooses for you.",
  "Cravings peak on a schedule — you are not broken, you are patterned. Break the pattern.",
  "In 15 minutes your prefrontal cortex will be under siege. Stand your post now.",
  "The lie says 'just once.' Your data says this hour is the trap. Surf, don't scroll.",
  "Shield check: your highest-risk hour is coming. Water, movement, exit the room.",
];

export function pickGroundingInsight(seed: number): string {
  return GROUNDING_INSIGHTS[seed % GROUNDING_INSIGHTS.length];
}
