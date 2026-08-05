import { supabase } from '@/lib/supabase';
import { isOnline } from '@/lib/network/connectivity';
import type { Commitment } from '@/types/commitment';

const COMMITMENT_COLUMNS =
  'id, user_id, pledge, starts_at, ends_at, honored, broken_at, created_at, client_created_at, synced';

export async function fetchCommitments(userId: string): Promise<Commitment[]> {
  const { data, error } = await supabase
    .from('commitments')
    .select(COMMITMENT_COLUMNS)
    .eq('user_id', userId)
    .order('starts_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('fetchCommitments', error);
    return [];
  }

  return (data ?? []) as Commitment[];
}

export async function insertCommitment(
  userId: string,
  row: Pick<
    Commitment,
    'id' | 'pledge' | 'starts_at' | 'ends_at' | 'client_created_at'
  >,
): Promise<Commitment | null> {
  const { data, error } = await supabase
    .from('commitments')
    .insert({
      id: row.id,
      user_id: userId,
      pledge: row.pledge,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      client_created_at: row.client_created_at,
      synced: true,
    })
    .select(COMMITMENT_COLUMNS)
    .single();

  if (error) {
    console.error('insertCommitment', error);
    return null;
  }

  return data as Commitment;
}

export async function updateCommitmentRemote(
  id: string,
  patch: Partial<Pick<Commitment, 'honored' | 'broken_at'>>,
): Promise<boolean> {
  if (!isOnline()) return false;

  const { error } = await supabase.from('commitments').update(patch).eq('id', id);
  if (error) {
    console.error('updateCommitmentRemote', error);
    return false;
  }

  return true;
}
