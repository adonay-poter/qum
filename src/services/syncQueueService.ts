import { readJson, writeJson } from '@/lib/storage/localStore';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import { isOnline } from '@/lib/network/connectivity';
import type { SyncQueueItem, SyncQueueOp } from '@/types/session';
import { completeWave, failWave, startWave } from '@/services/waveService';
import { insertCommitment, updateCommitmentRemote } from '@/services/commitmentService';
import { flushLetterUpsert } from '@/services/letterService';

function readQueue(): SyncQueueItem[] {
  return readJson<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) ?? [];
}

function writeQueue(queue: SyncQueueItem[]): void {
  writeJson(STORAGE_KEYS.SYNC_QUEUE, queue);
}

export function enqueue(op: SyncQueueOp): string {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    op,
    createdAt: Date.now(),
  };
  writeQueue([...readQueue(), item]);
  return item.id;
}

const localToServerWaveId = new Map<string, string>();

export async function flushSyncQueue(): Promise<void> {
  if (!isOnline()) return;

  const queue = readQueue();
  if (!queue.length) return;

  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    const ok = await processItem(item);
    if (!ok) remaining.push(item);
  }

  writeQueue(remaining);
}

async function processItem(item: SyncQueueItem): Promise<boolean> {
  const { op } = item;

  if (op.type === 'wave_start') {
    const wave = await startWave(op.userId);
    if (!wave) return false;
    localToServerWaveId.set(op.localWaveId, wave.id);
    return true;
  }

  if (op.type === 'wave_complete') {
    const waveId = resolveWaveId(op.waveId, op.localWaveId);
    if (!waveId) return false;
    return completeWave(waveId, op.durationSurvived, {
      completionMode: op.completionMode ?? 'full',
      urgeRatingAtExit: op.urgeRatingAtExit ?? null,
    });
  }

  if (op.type === 'wave_fail') {
    const waveId = resolveWaveId(op.waveId, op.localWaveId);
    if (!waveId) {
      if (op.reason === 'rage_quit') {
        return enqueueRageQuitWithoutWave(op);
      }
      return false;
    }
    return failWave(waveId, op.durationSurvived);
  }

  if (op.type === 'commitment_create') {
    const row = await insertCommitment(op.userId, {
      id: op.commitment.id,
      pledge: op.commitment.pledge,
      starts_at: op.commitment.starts_at,
      ends_at: op.commitment.ends_at,
      client_created_at: op.commitment.client_created_at,
    });
    return row !== null;
  }

  if (op.type === 'commitment_update') {
    return updateCommitmentRemote(op.id, op.patch);
  }

  if (op.type === 'letter_upsert') {
    return flushLetterUpsert(op.userId, op.letter);
  }

  return true;
}

function resolveWaveId(waveId: string | null, localWaveId: string): string | null {
  if (waveId) return waveId;
  return localToServerWaveId.get(localWaveId) ?? null;
}

async function enqueueRageQuitWithoutWave(
  op: Extract<SyncQueueOp, { type: 'wave_fail' }>,
): Promise<boolean> {
  const mapped = localToServerWaveId.get(op.localWaveId);
  if (!mapped) return false;
  return failWave(mapped, op.durationSurvived);
}

export function mapLocalWaveToServer(localWaveId: string, serverWaveId: string): void {
  localToServerWaveId.set(localWaveId, serverWaveId);
}

export function getServerWaveId(localWaveId: string): string | undefined {
  return localToServerWaveId.get(localWaveId);
}
