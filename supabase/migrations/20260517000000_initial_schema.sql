-- QUM: profiles, waves_log, tasks

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  resilience_level int not null default 100 check (resilience_level >= 0 and resilience_level <= 100),
  xp_points int not null default 0 check (xp_points >= 0),
  total_waves_surfed int not null default 0 check (total_waves_surfed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waves_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed boolean not null default false,
  duration_survived int not null default 0 check (duration_survived >= 0)
);

create index waves_log_user_started_idx on public.waves_log (user_id, started_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('physical', 'cognitive', 'mindful')),
  prompt_text text not null,
  verification_method text not null check (
    verification_method in ('tap_count', 'camera_upload', 'text_input')
  ),
  tap_target int,
  created_at timestamptz not null default now()
);

-- Seed tasks
insert into public.tasks (category, prompt_text, verification_method, tap_target) values
  ('physical', 'Do 10 pushups — tap with your nose on each rep', 'tap_count', 10),
  ('physical', 'Do 20 jumping jacks — tap the hit box each jump', 'tap_count', 20),
  ('physical', 'Hold a wall sit for 30 seconds — tap once per 3 seconds', 'tap_count', 10),
  ('physical', 'Sprint in place for 45 seconds — tap every 5 seconds', 'tap_count', 9),
  ('cognitive', 'Sketch a famous actor from memory', 'camera_upload', null),
  ('cognitive', 'Draw your childhood home floor plan', 'camera_upload', null),
  ('cognitive', 'List 12 countries that start with the letter B', 'text_input', null),
  ('cognitive', 'Name 15 animals that live in the ocean', 'text_input', null),
  ('mindful', 'Box breathing: 4-4-4-4 for one minute', 'tap_count', null);

alter table public.profiles enable row level security;
alter table public.waves_log enable row level security;
alter table public.tasks enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users read own waves"
  on public.waves_log for select
  using (auth.uid() = user_id);

create policy "Users insert own waves"
  on public.waves_log for insert
  with check (auth.uid() = user_id);

create policy "Users update own waves"
  on public.waves_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users read tasks"
  on public.tasks for select
  to authenticated
  using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.complete_wave(
  p_wave_id uuid,
  p_duration_survived int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.waves_log
  where id = p_wave_id and user_id = auth.uid();

  if v_user_id is null then
    raise exception 'Wave not found';
  end if;

  update public.waves_log
  set completed = true, duration_survived = p_duration_survived
  where id = p_wave_id;

  update public.profiles
  set
    total_waves_surfed = total_waves_surfed + 1,
    xp_points = xp_points + 50,
    resilience_level = least(100, resilience_level + 5),
    updated_at = now()
  where id = v_user_id;
end;
$$;

create or replace function public.fail_wave(
  p_wave_id uuid,
  p_duration_survived int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.waves_log
  set completed = false, duration_survived = p_duration_survived
  where id = p_wave_id and user_id = auth.uid();

  update public.profiles
  set
    resilience_level = greatest(0, resilience_level - 10),
    updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.complete_wave(uuid, int) to authenticated;
grant execute on function public.fail_wave(uuid, int) to authenticated;
