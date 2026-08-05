import type { LockupSize } from '@/design-system/tokens';

export interface LockupMetrics {
  glyphPx: number;
  qumPx: number;
  gapPx: number;
  hairlinePx: number;
  showTagline: boolean;
  haltBarHeight: number;
}

export const LOCKUP_METRICS: Record<LockupSize, LockupMetrics> = {
  xl: { glyphPx: 72, qumPx: 48, gapPx: 16, hairlinePx: 56, showTagline: true, haltBarHeight: 40 },
  lg: { glyphPx: 56, qumPx: 36, gapPx: 12, hairlinePx: 44, showTagline: true, haltBarHeight: 32 },
  md: { glyphPx: 44, qumPx: 28, gapPx: 10, hairlinePx: 34, showTagline: true, haltBarHeight: 26 },
  sm: { glyphPx: 32, qumPx: 20, gapPx: 8, hairlinePx: 24, showTagline: false, haltBarHeight: 20 },
  xs: { glyphPx: 24, qumPx: 16, gapPx: 6, hairlinePx: 18, showTagline: false, haltBarHeight: 16 },
};
