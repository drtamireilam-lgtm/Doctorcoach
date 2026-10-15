-- Isolated staging policy: maximum 24h, refresh inactivity <=1h.
-- Additive deployment DDL, not a CLI-generated migration. No application rows.
begin;
create schema dc_identity_staging;
revoke all on schema dc_identity_staging from public, anon, authenticated;
grant usage on schema dc_identity_staging to authenticated;
create function dc_identity_staging.session_active() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  claims jsonb := auth.jwt();
  owner uuid := auth.uid();
  sid uuid;
begin
  if owner is null or claims->>'role' is distinct from 'authenticated'
    or claims->>'is_anonymous' is distinct from 'false' then return false; end if;
  begin
    sid := (claims->>'session_id')::uuid;
    if (claims->>'exp')::numeric <= extract(epoch from statement_timestamp()) then return false; end if;
  exception when invalid_text_representation or numeric_value_out_of_range then return false;
  end;
  if sid is null or claims->>'exp' is null then return false; end if;
  return exists (
    select 1 from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=sid and s.user_id=owner and u.deleted_at is null
      and u.is_anonymous is false and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= statement_timestamp())
      and s.created_at <= statement_timestamp()
      and s.created_at > statement_timestamp() - interval '24 hours'
      and (s.not_after is null or s.not_after > statement_timestamp())
      and coalesce(s.refreshed_at at time zone 'UTC',s.created_at) <= statement_timestamp()
      and coalesce(s.refreshed_at at time zone 'UTC',s.created_at) > statement_timestamp() - interval '1 hour'
  );
end;
$$;
revoke all on function dc_identity_staging.session_active() from public, anon, authenticated;
grant execute on function dc_identity_staging.session_active() to authenticated;
-- The exposed entry point is an invoker wrapper returning only a boolean.
create function public.doctorcoach_staging_session_active() returns boolean
language sql security invoker set search_path = '' as $$
  select dc_identity_staging.session_active();
$$;
revoke all on function public.doctorcoach_staging_session_active() from public, anon, authenticated;
grant execute on function public.doctorcoach_staging_session_active() to authenticated;
commit;
