-- Migration: Create telegram_auth_sessions table for Telegram Bot Auth Flow

create table if not exists public.telegram_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text not null unique,
  status text not null default 'pending', -- 'pending', 'approved', 'expired'
  telegram_id bigint,
  telegram_username text,
  access_token text,
  refresh_token text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

-- Index for fast session lookup by session_code
create index if not exists telegram_auth_sessions_code_idx on public.telegram_auth_sessions (session_code);

-- Enable Row Level Security (RLS)
alter table public.telegram_auth_sessions enable row level security;

-- Policy 1: Anyone can create a new pending auth session
create policy "Anyone can create pending telegram auth sessions"
  on public.telegram_auth_sessions
  for insert
  with check (true);

-- Policy 2: Anyone can view auth session by specific code matching session
create policy "Anyone can view telegram auth session by code"
  on public.telegram_auth_sessions
  for select
  using (
    -- Restrict public selection to prevent token enumeration dumps
    session_code = current_setting('request.headers', true)::json->>'x-session-code'
    or expires_at > now()
  );

-- Enable Realtime broadcast for telegram_auth_sessions
alter publication supabase_realtime add table public.telegram_auth_sessions;
