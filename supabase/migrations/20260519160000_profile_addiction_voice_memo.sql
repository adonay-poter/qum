alter table public.profiles
  add column if not exists addiction_type text,
  add column if not exists addiction_type_other text,
  add column if not exists voice_memo_path text;

alter table public.profiles
  drop constraint if exists profiles_addiction_type_check;

alter table public.profiles
  add constraint profiles_addiction_type_check
  check (
    addiction_type is null
    or addiction_type in (
      'doomscroll',
      'porn',
      'gambling',
      'food',
      'alcohol',
      'nicotine',
      'cannabis',
      'gaming',
      'shopping',
      'other'
    )
  );

comment on column public.profiles.addiction_type is
  'Primary urge category selected during onboarding.';
comment on column public.profiles.addiction_type_other is
  'Free text when addiction_type is other.';
comment on column public.profiles.voice_memo_path is
  'Supabase Storage path under voice-memos bucket, e.g. {user_id}/onboarding.m4a.';
