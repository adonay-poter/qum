/**
 * QUM design tokens — aligned with Design.md (Indie Festival palette).
 * Canonical JSON: src/design-system/tokens.json · design system doc: QUM-Design-System.html
 * Accent is reserved for ቁም, Halt Bar, and one primary action per screen.
 */
export const tokens = {
  bg: '#0E0D0A',
  surface: '#161410',
  primary: '#E8E4DB',
  secondary: '#857F72',
  accent: '#FF6B1A',
  onAccent: '#0E0D0A',
} as const;

export type LockupSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

export const AMHARIC_GLYPH = 'ቁም';
