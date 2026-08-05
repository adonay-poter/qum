-- Waitlist: store emails of people signed up for the waitlist.
-- Only accessible via Edge Functions using service_role credentials to prevent abuse.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email)
);

create index waitlist_email_idx on public.waitlist (email);

-- Enable RLS (Row Level Security).
-- Since we do not define any policy, all public read/write requests from client SDKs will be rejected by default.
-- Only Deno Edge Functions using the service_role client will be allowed to interact with this table.
alter table public.waitlist enable row level security;
