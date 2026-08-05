-- Commitments are behavior promises; waves are tools, not overrides.
-- Remove legacy hold/override tracking from the commitment gate era.

alter table public.commitments
  drop column if exists override_count,
  drop column if exists override_reason,
  drop column if exists override_at,
  drop column if exists hold_count;
