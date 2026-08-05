-- Anonymous aggregate counters for the home solidarity signal (no user_id, no PII).

create table public.active_waves_ticker (
  hour_bucket timestamptz primary key,
  wave_starts int not null default 0 check (wave_starts >= 0),
  waves_in_progress int not null default 0 check (waves_in_progress >= 0)
);

comment on table public.active_waves_ticker is
  'Hourly anonymous wave counters for public solidarity display.';

-- tick-wave: increment starts + in-progress for the wave start hour.
create or replace function public.solidarity_tick_wave_start(p_started_at timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('hour', p_started_at at time zone 'utc');
begin
  insert into public.active_waves_ticker (hour_bucket, wave_starts, waves_in_progress)
  values (v_bucket, 1, 1)
  on conflict (hour_bucket) do update
  set
    wave_starts = active_waves_ticker.wave_starts + 1,
    waves_in_progress = active_waves_ticker.waves_in_progress + 1;
end;
$$;

-- untick-wave: decrement in-progress for the wave start hour.
create or replace function public.solidarity_untick_wave_end(p_started_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('hour', p_started_at at time zone 'utc');
begin
  update public.active_waves_ticker
  set waves_in_progress = greatest(0, waves_in_progress - 1)
  where hour_bucket = v_bucket;
end;
$$;

create or replace function public.trg_solidarity_wave_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.solidarity_tick_wave_start(new.started_at);
  return new;
end;
$$;

create trigger solidarity_on_wave_insert
  after insert on public.waves_log
  for each row
  execute function public.trg_solidarity_wave_insert();

-- Public aggregate view (no per-user rows).
create or replace view public.public_solidarity_view as
select
  coalesce(sum(waves_in_progress), 0)::int as active_now,
  coalesce(
    sum(wave_starts) filter (
      where hour_bucket > (now() at time zone 'utc') - interval '24 hours'
    ),
    0
  )::int as surfs_today
from public.active_waves_ticker;

grant select on public.public_solidarity_view to authenticated;
grant select on public.active_waves_ticker to authenticated;

-- Wire untick into wave completion paths.
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
    resilience_level = least(100, resilience_level + 5),
    last_wave_completed_at = now(),
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
declare
  v_started_at timestamptz;
begin
  select started_at into v_started_at
  from public.waves_log
  where id = p_wave_id and user_id = auth.uid();

  if v_started_at is null then
    raise exception 'Wave not found';
  end if;

  update public.waves_log
  set completed = false, duration_survived = p_duration_survived
  where id = p_wave_id;

  perform public.solidarity_untick_wave_end(v_started_at);
end;
$$;

grant execute on function public.complete_wave(uuid, int) to authenticated;
grant execute on function public.fail_wave(uuid, int) to authenticated;

grant execute on function public.solidarity_tick_wave_start(timestamptz) to service_role;
grant execute on function public.solidarity_untick_wave_end(timestamptz) to service_role;
