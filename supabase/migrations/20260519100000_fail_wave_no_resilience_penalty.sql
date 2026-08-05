-- Failure paths log the wave but do not reduce resilience.
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
end;
$$;

grant execute on function public.fail_wave(uuid, int) to authenticated;
