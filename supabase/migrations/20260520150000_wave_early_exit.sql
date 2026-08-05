-- Early victory: urge genuinely passed during Phase 2 (not abandon).

alter table public.waves_log
  add column if not exists completion_mode text,
  add column if not exists urge_rating_at_exit int;

alter table public.waves_log
  drop constraint if exists waves_log_completion_mode_chk;

alter table public.waves_log
  add constraint waves_log_completion_mode_chk
  check (completion_mode is null or completion_mode in ('full', 'early_exit'));

alter table public.waves_log
  drop constraint if exists waves_log_urge_rating_at_exit_chk;

alter table public.waves_log
  add constraint waves_log_urge_rating_at_exit_chk
  check (urge_rating_at_exit is null or (urge_rating_at_exit >= 0 and urge_rating_at_exit <= 10));

update public.waves_log
set completion_mode = 'full'
where completed = true and completion_mode is null;

create or replace function public.complete_wave(
  p_wave_id uuid,
  p_duration_survived int,
  p_completion_mode text default 'full',
  p_urge_rating_at_exit int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_started_at timestamptz;
  v_mode text := coalesce(p_completion_mode, 'full');
begin
  if v_mode not in ('full', 'early_exit') then
    raise exception 'Invalid completion_mode';
  end if;

  if p_urge_rating_at_exit is not null
     and (p_urge_rating_at_exit < 0 or p_urge_rating_at_exit > 10) then
    raise exception 'Invalid urge_rating_at_exit';
  end if;

  select user_id, started_at into v_user_id, v_started_at
  from public.waves_log
  where id = p_wave_id and user_id = auth.uid();

  if v_user_id is null then
    raise exception 'Wave not found';
  end if;

  update public.waves_log
  set
    completed = true,
    duration_survived = p_duration_survived,
    completion_mode = v_mode,
    urge_rating_at_exit = p_urge_rating_at_exit
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

grant execute on function public.complete_wave(uuid, int, text, int) to authenticated;
