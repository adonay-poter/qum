export interface Commitment {
  id: string;
  user_id: string;
  pledge: string;
  starts_at: string;
  ends_at: string;
  /** Set when the window ends or the user marks broken: true = held, false = broken. */
  honored: boolean | null;
  /** Set only on manual break (honored=false). */
  broken_at: string | null;
  created_at: string;
  client_created_at: string;
  synced: boolean;
}

/** Placeholder / suggestion for the pledge textarea — personal, not generic. */
export const COMMITMENT_PLEDGE_PLACEHOLDER =
  'Remember the harm this causes to the people I love — I will not act on this urge tonight.';

export interface CommitmentCreateInput {
  pledge: string;
  durationHours: number;
}

export const COMMITMENT_DURATION_OPTIONS = [
  { hours: 2, label: '2 hours' },
  { hours: 4, label: '4 hours' },
  { hours: 8, label: '8 hours' },
  { hours: 12, label: '12 hours' },
] as const;
