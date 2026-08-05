-- Manual slip logs + occurred_at for accurate heatmap / pattern timing

alter table public.crash_reports
  add column if not exists occurred_at timestamptz;

update public.crash_reports
set occurred_at = coalesce(occurred_at, created_at)
where occurred_at is null;

alter table public.crash_reports
  alter column occurred_at set default now();

alter table public.crash_reports
  alter column occurred_at set not null;

alter table public.crash_reports
  drop constraint if exists crash_reports_ended_in_check;

alter table public.crash_reports
  add constraint crash_reports_ended_in_check
  check (ended_in in ('abandoned', 'rage_quit', 'manual_log'));

create index if not exists crash_reports_user_occurred_idx
  on public.crash_reports (user_id, occurred_at desc);
