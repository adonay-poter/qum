/** Set VITE_DEV_FAST_WAVE=true in .env.local for 30s end-to-end session testing */
const fast = import.meta.env.VITE_DEV_FAST_WAVE === 'true';

export const WAVE_DURATION_SEC = fast ? 30 : 600;
export const PHASE_1_END_SEC = fast ? 9 : 180;
export const PHASE_2_END_SEC = fast ? 24 : 480;

/** Earliest Phase 2 moment user may start early-exit check (4 min in production). */
export const EARLY_EXIT_MIN_SEC = fast ? 12 : 240;

/** Box breathing: 4s inhale · 4s hold · 4s exhale · 4s hold */
export const BOX_PHASE_SEC = fast ? 1 : 4;
export const BOX_CYCLES = fast ? 1 : 4;
export const BREATHING_DURATION_SEC = BOX_PHASE_SEC * 4 * BOX_CYCLES;

/** Early-exit confirmation ritual. */
export const EXIT_CHECK_PAUSE_SEC = fast ? 3 : 5;
export const EXIT_CHECK_BREATH_IN_SEC = fast ? 2 : 5;
export const EXIT_CHECK_BREATH_OUT_SEC = fast ? 2 : 5;
