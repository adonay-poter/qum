-- Rename crash_reports → reflections; voluntary partial capture + audio paths.

alter table public.crash_reports rename to reflections;

alter table public.reflections
  add column if not exists mode text,
  add column if not exists trigger_audio_path text,
  add column if not exists location_audio_path text,
  add column if not exists loophole_audio_path text;

update public.reflections
set mode = case
  when ended_in = 'manual_log' then 'manual_log'
  else 'post_wave'
end
where mode is null;

alter table public.reflections
  alter column mode set default 'post_wave';

alter table public.reflections
  alter column mode set not null;

alter table public.reflections
  drop constraint if exists crash_reports_ended_in_check;

alter table public.reflections
  add constraint reflections_mode_check
  check (mode in ('post_wave', 'manual_log', 'delayed_prompt'));

alter table public.reflections
  drop constraint if exists crash_reports_trigger_other_chk;

alter table public.reflections
  drop constraint if exists crash_reports_location_other_chk;

alter table public.reflections
  alter column trigger drop not null,
  alter column location drop not null,
  alter column loophole drop not null,
  alter column ended_in drop not null;

-- Backward-compatible view for any external queries.
create or replace view public.crash_reports as
  select * from public.reflections;

grant select, insert, update on public.reflections to authenticated;

comment on table public.reflections is
  'Voluntary post-wave or manual reflections. No required fields.';
