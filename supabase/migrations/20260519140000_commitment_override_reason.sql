alter table public.commitments
  add column if not exists override_reason text,
  add column if not exists override_at timestamptz;

comment on column public.commitments.override_reason is
  'User-written explanation when overriding an active commitment window.';
comment on column public.commitments.override_at is
  'When the latest override_reason was submitted.';
