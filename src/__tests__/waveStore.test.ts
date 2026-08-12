import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWaveStore } from '@/stores/waveStore';

// Mock dependencies that waveStore relies on
vi.mock('@/repositories/taskRepository', () => ({
  pickBodyTask: vi.fn(() => ({ id: 'body-1', tap_target: 5, category: 'physical' })),
  pickMindfulTask: vi.fn(() => ({ id: 'mind-1', category: 'mindfulness' })),
  pickColdTask: vi.fn(() => ({ id: 'cold-1', category: 'cold' })),
  pickTask: vi.fn(() => ({ id: 'cog-1', category: 'cognitive' })),
  refreshTaskCache: vi.fn(),
}));

vi.mock('@/lib/storage/sessionLock', () => ({
  readSessionLock: vi.fn(() => null),
  clearSessionLock: vi.fn(),
  createSessionLock: vi.fn(() => ({})),
  writeSessionLock: vi.fn(),
  updateSessionLockPhase: vi.fn(),
}));

vi.mock('@/lib/haptics', () => ({
  haptic: {
    light: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/pulsar', () => ({
  pulsar: {
    playPreset: vi.fn(),
  },
}));

vi.mock('@/services/telemetryService', () => ({
  trackEvent: vi.fn(),
}));

describe('waveStore state machine', () => {
  beforeEach(() => {
    useWaveStore.getState().resetToIdle();
  });

  it('starts in IDLE state', () => {
    const state = useWaveStore.getState();
    expect(state.mode).toBe('IDLE');
    expect(state.isLocked).toBe(false);
    expect(state.elapsedSec).toBe(0);
  });

  it('allows setting user id', () => {
    useWaveStore.getState().setUserId('test-user-123');
    expect(useWaveStore.getState().userId).toBe('test-user-123');
  });

  it('resets state back to IDLE cleanly', () => {
    useWaveStore.getState().showWaveEndToast('Test toast');
    expect(useWaveStore.getState().waveEndToast).toBe('Test toast');

    useWaveStore.getState().clearWaveEndToast();
    expect(useWaveStore.getState().waveEndToast).toBeNull();
  });

  it('handles selecting Phase 1 modality', () => {
    useWaveStore.setState({ mode: 'PHASE_1_CHOICE', resilienceAtStart: 100 });
    useWaveStore.getState().selectPhase1Modality('body');

    const state = useWaveStore.getState();
    expect(state.phase1Modality).toBe('body');
    expect(state.mode).toBe('PHASE_1');
    expect(state.phase1Task).not.toBeNull();
  });

  it('increments tap count and completes phase 1 when target reached', () => {
    useWaveStore.setState({
      mode: 'PHASE_1',
      phase1Modality: 'body',
      phase1Task: { id: 'body-1', tap_target: 3, category: 'physical' } as any,
      tapCount: 0,
    });

    useWaveStore.getState().incrementTap(); // 1
    expect(useWaveStore.getState().tapCount).toBe(1);

    useWaveStore.getState().incrementTap(); // 2
    expect(useWaveStore.getState().tapCount).toBe(2);

    useWaveStore.getState().incrementTap(); // 3 - triggers completePhase1
    expect(useWaveStore.getState().phase1Cleared).toBe(true);
  });
});
