import { useMemo } from 'react';
import {
  selectActiveCommitment,
  selectUpcomingCommitments,
  useCommitmentStore,
} from '@/stores/commitmentStore';

/** Subscribe to commitment list, derive active/upcoming without unstable selector refs. */
export function useCommitmentSlice() {
  const list = useCommitmentStore((s) => s.list);

  const active = useMemo(() => selectActiveCommitment(list), [list]);
  const upcoming = useMemo(() => selectUpcomingCommitments(list), [list]);

  return { active, upcoming };
}
