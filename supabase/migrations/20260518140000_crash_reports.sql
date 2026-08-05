-- Post-relapse crash reports (incident logs)

create table public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wave_id uuid references public.waves_log (id) on delete set null,
  ended_in text not null check (ended_in in ('abandoned', 'rage_quit')),
  trigger text not null check (trigger in (
    'boredom', 'stress', 'loneliness', 'fatigue', 'anger', 'celebration', 'other'
  )),
  trigger_other text,
  location text not null check (location in (
    'bed', 'desk', 'bathroom', 'couch', 'kitchen', 'commute', 'outdoors', 'other'
  )),
  location_other text,
  loophole text not null,
  created_at timestamptz not null default now(),
  client_created_at timestamptz not null,
  synced boolean not null default true,
  constraint crash_reports_trigger_other_chk check (
    trigger <> 'other' or (trigger_other is not null and length(trim(trigger_other)) > 0)
  ),
  constraint crash_reports_location_other_chk check (
    location <> 'other' or (location_other is not null and length(trim(location_other)) > 0)
  )
);

create index crash_reports_user_created_idx
  on public.crash_reports (user_id, created_at desc);

create index crash_reports_user_trigger_idx
  on public.crash_reports (user_id, trigger);

create index crash_reports_user_location_idx
  on public.crash_reports (user_id, location);

alter table public.waves_log
  add column if not exists audit_id uuid references public.crash_reports (id) on delete set null;

alter table public.crash_reports enable row level security;

create policy "Users read own crash reports"
  on public.crash_reports for select
  using (auth.uid() = user_id);

create policy "Users insert own crash reports"
  on public.crash_reports for insert
  with check (auth.uid() = user_id);

create policy "Users update own crash reports"
  on public.crash_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
