-- Letter to Future Me: one private letter per user (upsert on save).

create table public.user_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_letters_user_id_key unique (user_id)
);

create index user_letters_user_id_idx on public.user_letters (user_id);

alter table public.user_letters enable row level security;

create policy "Users read own letter"
  on public.user_letters for select
  using (auth.uid() = user_id);

create policy "Users insert own letter"
  on public.user_letters for insert
  with check (auth.uid() = user_id);

create policy "Users update own letter"
  on public.user_letters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
