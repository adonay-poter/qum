-- Weekly calm-hour reflective check-ins (proactive, not crisis-driven).

create table public.calm_hour_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  reviewed_letter boolean not null default false,
  reviewed_voice_memo boolean not null default false,
  reviewed_patterns boolean not null default false,
  notes text
);

create index calm_hour_sessions_user_completed_idx
  on public.calm_hour_sessions (user_id, completed_at desc);

alter table public.calm_hour_sessions enable row level security;

create policy "Users read own calm hour sessions"
  on public.calm_hour_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own calm hour sessions"
  on public.calm_hour_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own calm hour sessions"
  on public.calm_hour_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own calm hour sessions"
  on public.calm_hour_sessions for delete
  to authenticated
  using (auth.uid() = user_id);
