-- Prompt 11: opt-in for playing voice memo during waves (not Calm Hour only).

alter table public.profiles
  add column if not exists voice_memo_in_wave_enabled boolean not null default false,
  add column if not exists voice_memo_recorded_at timestamptz;

comment on column public.profiles.voice_memo_in_wave_enabled is
  'User opted in at recording time to surface the memo in Phase 2 of a wave.';
comment on column public.profiles.voice_memo_recorded_at is
  'When the current voice_memo_path was last saved.';
