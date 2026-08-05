import type { WaveMode } from '@/types/database';
import type { Commitment } from '@/types/commitment';
import type { Letter } from '@/types/letter';

export interface ActiveSessionLock {
  startTime: number;
  targetEndTime: number;
  currentPhase: WaveMode;
  originalResilience: number;
  waveId: string | null;
  localWaveId: string;
  userId: string;
  elapsedSec: number;
  hadActiveCommitmentAtStart?: boolean;
}

export type SyncQueueOp =
  | { type: 'wave_start'; userId: string; localWaveId: string; startedAt: string }
  | {
      type: 'wave_complete';
      waveId: string | null;
      localWaveId: string;
      durationSurvived: number;
      completionMode?: 'full' | 'early_exit';
      urgeRatingAtExit?: number | null;
    }
  | {
      type: 'wave_fail';
      waveId: string | null;
      localWaveId: string;
      durationSurvived: number;
      reason?: 'abandon' | 'rage_quit';
    }
  | { type: 'commitment_create'; userId: string; commitment: Commitment }
  | {
      type: 'commitment_update';
      id: string;
      patch: Partial<Pick<Commitment, 'honored' | 'broken_at'>>;
    }
  | { type: 'letter_upsert'; userId: string; letter: Letter };

export interface SyncQueueItem {
  id: string;
  op: SyncQueueOp;
  createdAt: number;
}

export interface PowValidationResult {
  isValid: boolean;
  reason: string;
  debug?: string;
  isOffline?: boolean;
}
