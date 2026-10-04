-- Local transactional test fixture for the applied doctorcoach_profiles migration.
begin;
create schema if not exists doctorcoach_private;
revoke all on schema doctorcoach_private from public;

create table public.doctorcoach_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  effort_mode text not null default 'RPE' check (effort_mode in ('RPE','RIR')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.doctorcoach_profiles enable row level security;
alter table public.doctorcoach_profiles force row level security;
revoke all on public.doctorcoach_profiles from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.doctorcoach_profiles to authenticated;
grant insert (id, display_name, effort_mode) on public.doctorcoach_profiles to authenticated;
grant update (display_name, effort_mode) on public.doctorcoach_profiles to authenticated;

create policy profile_read_self on public.doctorcoach_profiles for select to authenticated
using ((select auth.uid()) = id and coalesce((select auth.jwt())->>'is_anonymous','true') = 'false');
create policy profile_insert_self on public.doctorcoach_profiles for insert to authenticated
with check ((select auth.uid()) = id and coalesce((select auth.jwt())->>'is_anonymous','true') = 'false');
create policy profile_update_self on public.doctorcoach_profiles for update to authenticated
using ((select auth.uid()) = id and coalesce((select auth.jwt())->>'is_anonymous','true') = 'false')
with check ((select auth.uid()) = id and coalesce((select auth.jwt())->>'is_anonymous','true') = 'false');

create function doctorcoach_private.bump_profile_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function doctorcoach_private.bump_profile_version() from public;
create trigger doctorcoach_profile_version before update on public.doctorcoach_profiles
for each row execute function doctorcoach_private.bump_profile_version();
commit;
