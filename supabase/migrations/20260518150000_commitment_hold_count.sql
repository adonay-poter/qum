-- Track how often the user held the line during an active window (not a one-shot honor flag).

alter table public.commitments
  add column if not exists hold_count int not null default 0;

alter table public.commitments
  drop constraint if exists commitments_hold_count_chk;

alter table public.commitments
  add constraint commitments_hold_count_chk check (hold_count >= 0);
