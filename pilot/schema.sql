-- Run in Supabase SQL editor before enabling the pilot API.
-- Tables are intentionally inaccessible directly to anonymous clients.
create table if not exists public.pilot_applications (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (char_length(full_name) between 1 and 120),
 email text not null,
 interest text not null check (interest in ('training','rehab','both')),
 consent_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.pilot_feedback (
 id uuid primary key default gen_random_uuid(),
 email text not null,
 category text not null check(category in ('idea','bug','experience')),
 message text not null check(char_length(message) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.pilot_applications enable row level security;
alter table public.pilot_feedback enable row level security;
-- No anonymous policies. Use authenticated, server-side API with rate limiting,
-- CAPTCHA/abuse protection, consent audit and staff-only access.
