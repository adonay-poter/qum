-- Onboarding fields for Arch profiles

alter table public.profiles
  add column if not exists has_completed_onboarding boolean not null default false,
  add column if not exists peak_danger_hour int,
  add column if not exists physical_baseline int,
  add column if not exists north_star text;

alter table public.profiles
  drop constraint if exists profiles_peak_danger_hour_check;

alter table public.profiles
  add constraint profiles_peak_danger_hour_check
  check (peak_danger_hour is null or (peak_danger_hour >= 0 and peak_danger_hour <= 23));

alter table public.profiles
  drop constraint if exists profiles_physical_baseline_check;

alter table public.profiles
  add constraint profiles_physical_baseline_check
  check (physical_baseline is null or physical_baseline > 0);
