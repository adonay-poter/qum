-- Commitment device: time-boxed urge surf pledges

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pledge text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  override_count int not null default 0 check (override_count >= 0),
  honored boolean,
  created_at timestamptz not null default now(),
  client_created_at timestamptz not null,
  synced boolean not null default true,
  constraint commitments_window_chk check (ends_at > starts_at)
);

create index commitments_user_ends_idx
  on public.commitments (user_id, ends_at desc);

create index commitments_user_active_idx
  on public.commitments (user_id, starts_at, ends_at);

alter table public.commitments enable row level security;

create policy "Users read own commitments"
  on public.commitments for select
  using (auth.uid() = user_id);

create policy "Users insert own commitments"
  on public.commitments for insert
  with check (auth.uid() = user_id);

create policy "Users update own commitments"
  on public.commitments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
