-- Candidate setup for a NEW ISOLATED Supabase environment only.
-- NOT executed against the existing pilot project. No data tables are migrated.
-- The definer is private because reading auth.sessions requires privileged access.
CREATE SCHEMA IF NOT EXISTS dc_identity_staging;
REVOKE ALL ON SCHEMA dc_identity_staging FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA dc_identity_staging TO authenticated;
CREATE OR REPLACE FUNCTION dc_identity_staging.session_active()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claims jsonb := auth.jwt(); owner uuid := auth.uid(); sid uuid;
BEGIN
 IF owner IS NULL OR claims->>'role' IS DISTINCT FROM 'authenticated'
  OR claims->>'is_anonymous' IS DISTINCT FROM 'false' THEN RETURN false; END IF;
 BEGIN
  sid := (claims->>'session_id')::uuid;
  IF (claims->>'exp')::numeric <= extract(epoch FROM statement_timestamp()) THEN RETURN false; END IF;
 EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
 END;
 IF sid IS NULL OR claims->>'exp' IS NULL THEN RETURN false; END IF;
 RETURN EXISTS (
  SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
  WHERE s.id=sid AND s.user_id=owner AND u.deleted_at IS NULL
   AND u.is_anonymous IS false AND u.email_confirmed_at IS NOT NULL
   AND (u.banned_until IS NULL OR u.banned_until<=statement_timestamp())
   AND s.created_at<=statement_timestamp()
   AND s.created_at>statement_timestamp()-interval '24 hours'
   AND (s.not_after IS NULL OR s.not_after>statement_timestamp())
   AND coalesce(s.refreshed_at AT TIME ZONE 'UTC',s.created_at)<=statement_timestamp()
   AND coalesce(s.refreshed_at AT TIME ZONE 'UTC',s.created_at)>statement_timestamp()-interval '1 hour'
 );
END;
$$;
REVOKE ALL ON FUNCTION dc_identity_staging.session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION dc_identity_staging.session_active() TO authenticated;
CREATE OR REPLACE FUNCTION public.doctorcoach_staging_session_active()
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 SELECT dc_identity_staging.session_active();
$$;
REVOKE ALL ON FUNCTION public.doctorcoach_staging_session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctorcoach_staging_session_active() TO authenticated;
