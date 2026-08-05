-- Practice/atrophy: track last successful wave for client-side decay model.

alter table public.profiles
  add column if not exists last_wave_completed_at timestamptz;

comment on column public.profiles.last_wave_completed_at is
  'Timestamp of the user''s most recent completed wave; drives inactivity decay.';

-- waves_log has no completed_at; use started_at for completed waves as backfill proxy.
update public.profiles p
set last_wave_completed_at = sub.last_completed_at
from (
  select
    user_id,
    max(started_at) as last_completed_at
  from public.waves_log
  where completed = true
  group by user_id
) sub
where p.id = sub.user_id;

-- Keep complete_wave RPC in sync with the new column.
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
    last_wave_completed_at = now(),
    updated_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.complete_wave(uuid, int) to authenticated;
