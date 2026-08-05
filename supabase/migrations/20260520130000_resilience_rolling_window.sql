-- Rolling 30-day resilience model (no time-based decay).
-- Source of truth: recompute_resilience(user_id).

alter table public.profiles
  alter column resilience_level set default 50;

alter table public.commitments
  add column if not exists broken_at timestamptz;

comment on column public.commitments.broken_at is
  'Set when the user manually marks a commitment broken (honored=false).';

create or replace function public.recompute_resilience(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - interval '30 days';
  v_previous int;
  v_completed int := 0;
  v_failed int := 0;
  v_reflections int := 0;
  v_calm int := 0;
  v_broken int := 0;
  v_any_ever boolean := false;
  v_in_window int := 0;
  v_score int;
  v_new int;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  select resilience_level into v_previous
  from public.profiles
  where id = p_user_id;

  if v_previous is null then
    return 50;
  end if;

  select count(*)::int into v_completed
  from public.waves_log
  where user_id = p_user_id
    and completed = true
    and started_at >= v_window_start;

  select count(*)::int into v_failed
  from public.waves_log
  where user_id = p_user_id
    and completed = false
    and started_at >= v_window_start;

  select count(*)::int into v_reflections
  from public.reflections
  where user_id = p_user_id
    and created_at >= v_window_start;

  select count(*)::int into v_calm
  from public.calm_hour_sessions
  where user_id = p_user_id
    and completed_at >= v_window_start;

  select count(*)::int into v_broken
  from public.commitments
  where user_id = p_user_id
    and honored = false
    and broken_at is not null
    and broken_at >= v_window_start;

  v_in_window := v_completed + v_failed + v_reflections + v_calm + v_broken;

  if v_in_window = 0 then
    select exists (
      select 1 from public.waves_log where user_id = p_user_id
      union all
      select 1 from public.reflections where user_id = p_user_id
      union all
      select 1 from public.calm_hour_sessions where user_id = p_user_id
      union all
      select 1 from public.commitments
        where user_id = p_user_id
          and (honored is not null or broken_at is not null)
    ) into v_any_ever;

    if not v_any_ever then
      v_new := 50;
    else
      v_new := v_previous;
    end if;
  else
    v_score := 50
      + least(v_completed * 2, 30)
      - least(v_failed * 1, 10)
      + least(v_reflections * 1, 10)
      + least(v_calm * 5, 15)
      - least(v_broken * 2, 10);

    v_new := greatest(0, least(100, v_score));
  end if;

  update public.profiles
  set resilience_level = v_new, updated_at = v_now
  where id = p_user_id;

  return v_new;
end;
$$;

grant execute on function public.recompute_resilience(uuid) to authenticated;

-- Wave completion / failure
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
  v_started_at timestamptz;
begin
  select user_id, started_at into v_user_id, v_started_at
  from public.waves_log
  where id = p_wave_id and user_id = auth.uid();

  if v_user_id is null then
    raise exception 'Wave not found';
  end if;

  update public.waves_log
  set completed = true, duration_survived = p_duration_survived
  where id = p_wave_id;

  perform public.solidarity_untick_wave_end(v_started_at);

  update public.profiles
  set
    total_waves_surfed = total_waves_surfed + 1,
    xp_points = xp_points + 50,
    last_wave_completed_at = now(),
    updated_at = now()
  where id = v_user_id;

  perform public.recompute_resilience(v_user_id);
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
declare
  v_user_id uuid;
  v_started_at timestamptz;
begin
  select user_id, started_at into v_user_id, v_started_at
  from public.waves_log
  where id = p_wave_id and user_id = auth.uid();

  if v_started_at is null then
    raise exception 'Wave not found';
  end if;

  update public.waves_log
  set completed = false, duration_survived = p_duration_survived
  where id = p_wave_id;

  perform public.solidarity_untick_wave_end(v_started_at);

  perform public.recompute_resilience(v_user_id);
end;
$$;

-- Reflections & calm-hour inserts (client uses direct table access)
create or replace function public.trigger_recompute_resilience()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_resilience(new.user_id);
  return new;
end;
$$;

drop trigger if exists reflections_recompute_resilience on public.reflections;
create trigger reflections_recompute_resilience
  after insert on public.reflections
  for each row
  execute function public.trigger_recompute_resilience();

drop trigger if exists calm_hour_recompute_resilience on public.calm_hour_sessions;
create trigger calm_hour_recompute_resilience
  after insert on public.calm_hour_sessions
  for each row
  execute function public.trigger_recompute_resilience();

-- Manual commitment break (honored=false + broken_at)
create or replace function public.trigger_recompute_resilience_on_commitment_break()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.honored = false
     and new.broken_at is not null
     and (old.honored is distinct from false or old.broken_at is null) then
    perform public.recompute_resilience(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists commitments_recompute_resilience on public.commitments;
create trigger commitments_recompute_resilience
  after update on public.commitments
  for each row
  execute function public.trigger_recompute_resilience_on_commitment_break();
