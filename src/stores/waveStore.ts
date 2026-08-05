import { create } from 'zustand';
import {
  pickBodyTask,
  pickColdTask,
  pickMindfulTask,
  pickTask,
  refreshTaskCache,
} from '@/repositories/taskRepository';
import { hashTaskId } from '@/lib/tasks/taskIdHash';
import { isOnline } from '@/lib/network/connectivity';
import { useProfileStore } from '@/stores/profileStore';
import { completeWaveOfflineAware, startWaveOfflineAware } from '@/services/waveOperations';
import {
  clearSessionLock,
  createSessionLock,
  readSessionLock,
  updateSessionLockPhase,
  writeSessionLock,
} from '@/lib/storage/sessionLock';
import { useCommitmentStore } from '@/stores/commitmentStore';
import { trackEvent } from '@/services/telemetryService';
import {
  BREATHING_DURATION_SEC,
  PHASE_1_END_SEC,
  PHASE_2_END_SEC,
  WAVE_DURATION_SEC,
  EARLY_EXIT_MIN_SEC,
  sanitizeWaveMode,
  type Task,
  type WaveMode,
  type WaveCompletionMode,
} from '@/types/database';
import type { Commitment } from '@/types/commitment';
import type { Phase1Modality } from '@/types/wave';
import { useLetterStore } from '@/stores/letterStore';
import {
  choiceToVariant,
  getPhase2Availability,
  type Phase2ChoiceOption,
} from '@/lib/phase2/phase2Availability';
import type { Phase2Variant } from '@/lib/phase2/phase2Routing';
import { haptic } from '@/lib/haptics';
import { pulsar } from '@/lib/pulsar';

/** Last Phase 2 choice from a completed wave this app session (not persisted to disk). */
let sessionLastCompletedPhase2Choice: Phase2ChoiceOption | null = null;

interface WaveStore {
  mode: WaveMode;
  waveId: string | null;
  localWaveId: string | null;
  userId: string | null;
  resilienceAtStart: number;
  elapsedSec: number;
  phase1Modality: Phase1Modality | null;
  phase1Task: Task | null;
  phase2Task: Task | null;
  phase2Variant: Phase2Variant | null;
  tapCount: number;
  phase1Cleared: boolean;
  phase2ProofSubmitted: boolean;
  breathingElapsedSec: number;
  breathingComplete: boolean;
  isLocked: boolean;
  isCompleting: boolean;
  tickIntervalId: ReturnType<typeof setInterval> | null;
  waveEndToast: string | null;
  commitmentAtWaveStart: Commitment | null;
  hadActiveCommitmentAtStart: boolean;
  resilienceGainDelta: number | null;
  lastCompletedPhase2Choice: Phase2ChoiceOption | null;

  setUserId: (id: string | null) => void;
  hydrate: () => void;
  triggerUrge: () => Promise<boolean>;
  tick: () => void;
  selectPhase1Modality: (modality: Phase1Modality) => void;
  completePhase1: () => void;
  selectPhase2Choice: (option: Phase2ChoiceOption) => void;
  startExitCheck: () => void;
  /** Logs rating; returns whether to continue exit flow or resume Phase 2 silently. */
  submitExitCheckRating: (rating: number) => 'wrap_up' | 'return_phase2';
  completeEarlyExit: (urgeRating: number) => Promise<void>;
  incrementTap: () => void;
  submitPhase2Proof: () => void;
  completeBreathingTick: () => void;
  showWaveEndToast: (message: string) => void;
  showNeutralWaveEndToast: () => void;
  clearWaveEndToast: () => void;
  resetToIdle: () => void;
  _enterPhase2Choice: () => void;
  _activatePhase2: (option: Phase2ChoiceOption) => void;
  _enterPhase3: () => void;
  _handleVictory: (options?: {
    completionMode?: WaveCompletionMode;
    urgeRatingAtExit?: number | null;
  }) => Promise<void>;
  _startWave: () => Promise<boolean>;
  _syncSessionLock: () => void;
  _stopTicker: () => void;
  _startTicker: () => void;
}

function resolveTickMode(
  elapsed: number,
  phase1Cleared: boolean,
  phase2Variant: Phase2Variant | null,
  phase2ProofSubmitted: boolean,
  currentMode: WaveMode,
): WaveMode {
  if (currentMode === 'PHASE_EXIT_CHECK') return 'PHASE_EXIT_CHECK';
  if (phase2ProofSubmitted || elapsed >= PHASE_2_END_SEC) return 'PHASE_3';
  if (phase2Variant !== null) return 'PHASE_2';
  if (currentMode === 'PHASE_2_CHOICE') return 'PHASE_2_CHOICE';
  if (phase1Cleared || elapsed >= PHASE_1_END_SEC) return 'PHASE_2_CHOICE';
  if (currentMode === 'PHASE_1_CHOICE') return 'PHASE_1_CHOICE';
  return 'PHASE_1';
}

export const useWaveStore = create<WaveStore>((set, get) => ({
  mode: 'IDLE',
  waveId: null,
  localWaveId: null,
  userId: null,
  resilienceAtStart: 100,
  elapsedSec: 0,
  phase1Modality: null,
  phase1Task: null,
  phase2Task: null,
  phase2Variant: null,
  tapCount: 0,
  phase1Cleared: false,
  phase2ProofSubmitted: false,
  breathingElapsedSec: 0,
  breathingComplete: false,
  isLocked: false,
  isCompleting: false,
  tickIntervalId: null,
  waveEndToast: null,
  commitmentAtWaveStart: null,
  hadActiveCommitmentAtStart: false,
  resilienceGainDelta: null,
  lastCompletedPhase2Choice: sessionLastCompletedPhase2Choice,

  setUserId: (id) => set({ userId: id }),

  hydrate: () => {
    const lock = readSessionLock();
    if (!lock) return;
    const phase = sanitizeWaveMode(lock.currentPhase);
    if (phase !== lock.currentPhase) {
      clearSessionLock();
    }
    set({
      mode: 'IDLE',
      isLocked: false,
      isCompleting: false,
      lastCompletedPhase2Choice: sessionLastCompletedPhase2Choice,
    });
  },

  showWaveEndToast: (message) => set({ waveEndToast: message }),

  showNeutralWaveEndToast: () =>
    get().showWaveEndToast('Wave ended. Resilience held steady.'),

  clearWaveEndToast: () => set({ waveEndToast: null }),

  _stopTicker: () => {
    const { tickIntervalId } = get();
    if (tickIntervalId) clearInterval(tickIntervalId);
    set({ tickIntervalId: null });
  },

  _startTicker: () => {
    get()._stopTicker();
    const id = setInterval(() => get().tick(), 1000);
    set({ tickIntervalId: id });
  },

  _syncSessionLock: () => {
    const state = get();
    const lock = readSessionLock();
    if (!lock || !state.localWaveId) return;
    writeSessionLock({
      ...lock,
      currentPhase: state.mode,
      elapsedSec: state.elapsedSec,
      waveId: state.waveId,
    });
  },

  _startWave: async () => {
    const { userId } = get();
    if (!userId) return false;

    const activeCommitment = useCommitmentStore.getState().getActive();
    const hadActiveCommitment = Boolean(activeCommitment);

    const profile = (await useProfileStore.getState().loadProfile(userId)) ?? {
      id: userId,
      resilience_level: 100,
      xp_points: 0,
      total_waves_surfed: 0,
      has_completed_onboarding: false,
      peak_danger_hour: null,
      physical_baseline: null,
      north_star: null,
    };

    void refreshTaskCache();
    void useLetterStore.getState().load(userId, { force: true });

    const { waveId, localWaveId } = await startWaveOfflineAware(userId);

    trackEvent('wave_started', { had_active_commitment: hadActiveCommitment });

    const lock = createSessionLock({
      userId,
      waveId,
      localWaveId,
      originalResilience: profile.resilience_level,
      hadActiveCommitmentAtStart: hadActiveCommitment,
    });
    writeSessionLock(lock);

    set({
      mode: 'PHASE_1_CHOICE',
      waveId,
      localWaveId,
      resilienceAtStart: profile.resilience_level,
      elapsedSec: 0,
      phase1Modality: null,
      phase1Task: null,
      phase2Task: null,
      phase2Variant: null,
      tapCount: 0,
      phase1Cleared: false,
      phase2ProofSubmitted: false,
      breathingElapsedSec: 0,
      breathingComplete: false,
      isLocked: true,
      isCompleting: false,
      commitmentAtWaveStart: activeCommitment,
      hadActiveCommitmentAtStart: hadActiveCommitment,
      resilienceGainDelta: null,
      lastCompletedPhase2Choice: sessionLastCompletedPhase2Choice,
    });

    get()._startTicker();
    return true;
  },

  triggerUrge: async () => {
    const { userId } = get();
    if (!userId || get().isLocked) return false;
    void pulsar.playPreset('boulder');
    return get()._startWave();
  },

  selectPhase1Modality: (modality) => {
    if (get().mode !== 'PHASE_1_CHOICE') return;

    const resilience = get().resilienceAtStart;
    const phase1Task =
      modality === 'body'
        ? pickBodyTask(resilience)
        : modality === 'stillness'
          ? pickMindfulTask(resilience)
          : modality === 'cold'
            ? pickColdTask(resilience)
            : null;

    set({
      phase1Modality: modality,
      phase1Task,
      mode: 'PHASE_1',
      tapCount: 0,
    });

    trackEvent('phase1_modality_selected', {
      modality,
      had_active_commitment: get().hadActiveCommitmentAtStart,
    });

    if (phase1Task) {
      trackEvent('phase1_task_selected', {
        category: phase1Task.category,
        modality: phase1Task.modality ?? '',
        difficulty_tier: phase1Task.difficulty_tier,
        task_id_hash: hashTaskId(phase1Task.id),
      });
    }
    updateSessionLockPhase('PHASE_1', get().elapsedSec);
    get()._syncSessionLock();
  },

  completePhase1: () => {
    const { mode, phase1Cleared } = get();
    if (mode !== 'PHASE_1' || phase1Cleared) return;

    set({ phase1Cleared: true });
    get()._enterPhase2Choice();
    get()._syncSessionLock();
  },

  _enterPhase2Choice: () => {
    const letter = useLetterStore.getState().letter;
    const profile = useProfileStore.getState().profile;
    const availability = getPhase2Availability(letter, profile);

    if (availability.artifactOptionCount === 0) {
      get()._activatePhase2('cognitive');
      return;
    }

    set({ mode: 'PHASE_2_CHOICE' });
    updateSessionLockPhase('PHASE_2_CHOICE', get().elapsedSec);
  },

  selectPhase2Choice: (option) => {
    if (get().mode !== 'PHASE_2_CHOICE') return;
    get()._activatePhase2(option);
  },

  _activatePhase2: (option) => {
    const letter = useLetterStore.getState().letter;
    const profile = useProfileStore.getState().profile;
    const availability = getPhase2Availability(letter, profile);

    if (option === 'letter' && !availability.letter) return;
    if (option === 'voice' && !availability.voice) return;

    const variant = choiceToVariant(option);

    trackEvent('phase2_choice_made', {
      option,
      had_alternatives_count: availability.enabledCount,
    });

    if (variant === 'letter' && letter?.body) {
      trackEvent('letter_surfaced_in_wave', {
        character_count: letter.body.length,
        had_active_commitment: get().hadActiveCommitmentAtStart,
      });
      set({ phase2Variant: 'letter', phase2Task: null, tapCount: 0, mode: 'PHASE_2' });
    } else if (variant === 'voice_memo') {
      trackEvent('voice_memo_surfaced_in_wave', {
        had_active_commitment: get().hadActiveCommitmentAtStart,
      });
      set({ phase2Variant: 'voice_memo', phase2Task: null, tapCount: 0, mode: 'PHASE_2' });
    } else {
      const task = pickTask('cognitive', get().resilienceAtStart);
      set({ phase2Variant: 'cognitive', phase2Task: task, tapCount: 0, mode: 'PHASE_2' });
    }

    updateSessionLockPhase('PHASE_2', get().elapsedSec);
    get()._syncSessionLock();
  },

  incrementTap: () => {
    const { mode, phase1Modality, phase1Task, tapCount } = get();
    if (mode !== 'PHASE_1' || phase1Modality !== 'body' || !phase1Task) return;

    const target = phase1Task.tap_target ?? 10;
    const next = tapCount + 1;
    set({ tapCount: next });
    haptic.light();

    if (next >= target) {
      haptic.success();
      get().completePhase1();
      return;
    }
    get()._syncSessionLock();
  },

  startExitCheck: () => {
    const { mode, elapsedSec } = get();
    if (mode !== 'PHASE_2' || elapsedSec < EARLY_EXIT_MIN_SEC) return;

    set({ mode: 'PHASE_EXIT_CHECK' });
    trackEvent('exit_check_started');
    updateSessionLockPhase('PHASE_EXIT_CHECK', get().elapsedSec);
    get()._syncSessionLock();
  },

  submitExitCheckRating: (rating) => {
    if (get().mode !== 'PHASE_EXIT_CHECK') return 'return_phase2';

    trackEvent('exit_check_rating', { rating });

    if (rating >= 4) {
      trackEvent('exit_check_returned_to_phase2', { rating });
      set({ mode: 'PHASE_2' });
      updateSessionLockPhase('PHASE_2', get().elapsedSec);
      get()._syncSessionLock();
      return 'return_phase2';
    }

    return 'wrap_up';
  },

  completeEarlyExit: async (urgeRating) => {
    if (get().mode !== 'PHASE_EXIT_CHECK') return;

    trackEvent('exit_check_completed_early', { rating: urgeRating });

    await get()._handleVictory({
      completionMode: 'early_exit',
      urgeRatingAtExit: urgeRating,
    });
  },

  submitPhase2Proof: () => {
    const { mode } = get();
    if (mode !== 'PHASE_2') return;
    set({ phase2ProofSubmitted: true });
    get()._enterPhase3();
    get()._syncSessionLock();
  },

  completeBreathingTick: () => {
    const { mode, breathingElapsedSec, breathingComplete } = get();
    if (mode !== 'PHASE_3' || breathingComplete) return;

    const next = breathingElapsedSec + 1;
    if (next >= BREATHING_DURATION_SEC) {
      set({ breathingElapsedSec: BREATHING_DURATION_SEC, breathingComplete: true });
    } else {
      set({ breathingElapsedSec: next });
    }
    get()._syncSessionLock();
  },

  _enterPhase3: () => {
    if (get().mode === 'PHASE_3') return;
    set({
      mode: 'PHASE_3',
      breathingElapsedSec: 0,
      breathingComplete: false,
    });
    updateSessionLockPhase('PHASE_3', get().elapsedSec);
  },

  tick: () => {
    const state = get();
    if (!state.isLocked || state.isCompleting || state.mode === 'VICTORY') return;

    const elapsedSec = state.elapsedSec + 1;

    if (
      state.mode === 'PHASE_1_CHOICE' ||
      state.mode === 'PHASE_2_CHOICE' ||
      state.mode === 'PHASE_EXIT_CHECK'
    ) {
      set({ elapsedSec });
      get()._syncSessionLock();
      if (elapsedSec >= WAVE_DURATION_SEC) void get()._handleVictory();
      return;
    }

    let phase1Cleared = state.phase1Cleared;

    if (
      !phase1Cleared &&
      state.mode === 'PHASE_1' &&
      elapsedSec >= PHASE_1_END_SEC
    ) {
      phase1Cleared = true;
      if (state.phase2Variant === null) {
        get()._enterPhase2Choice();
      }
    }

    const modeBeforeResolve = get().mode;
    if (
      phase1Cleared &&
      state.phase2Variant === null &&
      modeBeforeResolve !== 'PHASE_2_CHOICE' &&
      modeBeforeResolve !== 'PHASE_2'
    ) {
      get()._enterPhase2Choice();
    }

    const mode = resolveTickMode(
      elapsedSec,
      phase1Cleared,
      get().phase2Variant,
      state.phase2ProofSubmitted,
      get().mode,
    );

    if (mode === 'PHASE_3' && state.mode !== 'PHASE_3') {
      get()._enterPhase3();
    }

    set({ elapsedSec, mode, phase1Cleared });
    get()._syncSessionLock();

    if (mode === 'PHASE_3') {
      if (!state.breathingComplete) {
        get().completeBreathingTick();
      }
      const afterBreath = get();
      if (afterBreath.breathingComplete) {
        void get()._handleVictory();
        return;
      }
    }

    if (elapsedSec >= WAVE_DURATION_SEC) {
      void get()._handleVictory();
    }
  },

  _handleVictory: async (options) => {
    const current = get();
    if (!current.isLocked || current.isCompleting || current.mode === 'VICTORY') return;

    const {
      waveId,
      localWaveId,
      elapsedSec,
      hadActiveCommitmentAtStart,
      resilienceAtStart,
      phase2Variant,
    } = current;
    set({ isCompleting: true });
    get()._stopTicker();

    const completionMode = options?.completionMode ?? 'full';
    const urgeRatingAtExit = options?.urgeRatingAtExit ?? null;

    if (phase2Variant) {
      sessionLastCompletedPhase2Choice =
        phase2Variant === 'voice_memo' ? 'voice' : phase2Variant;
    }

    if (localWaveId) {
      await completeWaveOfflineAware(
        waveId,
        localWaveId,
        Math.min(elapsedSec, WAVE_DURATION_SEC),
        { completionMode, urgeRatingAtExit },
      );
    }

    trackEvent('wave_completed', {
      had_active_commitment: hadActiveCommitmentAtStart,
      completion_mode: completionMode,
    });

    const uid = get().userId;
    let gainDelta = 0;
    if (uid) {
      if (isOnline()) {
        await useProfileStore.getState().loadProfile(uid, { force: true });
      }
      const recomputed = await useProfileStore.getState().recomputeResilience(uid);
      const newLevel =
        recomputed ?? useProfileStore.getState().profile?.resilience_level ?? resilienceAtStart;
      gainDelta = newLevel - resilienceAtStart;
    }

    set({
      mode: 'VICTORY',
      isLocked: false,
      isCompleting: false,
      resilienceGainDelta: gainDelta,
      lastCompletedPhase2Choice: sessionLastCompletedPhase2Choice,
    });
  },

  resetToIdle: () => {
    get()._stopTicker();
    clearSessionLock();
    set({
      mode: 'IDLE',
      waveId: null,
      localWaveId: null,
      elapsedSec: 0,
      phase1Modality: null,
      phase1Task: null,
      phase2Task: null,
      phase2Variant: null,
      tapCount: 0,
      phase1Cleared: false,
      phase2ProofSubmitted: false,
      breathingElapsedSec: 0,
      breathingComplete: false,
      isLocked: false,
      isCompleting: false,
      commitmentAtWaveStart: null,
      hadActiveCommitmentAtStart: false,
      resilienceGainDelta: null,
      lastCompletedPhase2Choice: sessionLastCompletedPhase2Choice,
    });
  },
}));
