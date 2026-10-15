-- Applied ONLY to isolated staging jbfkzkzcznfacsjdawmf on 2026-10-15.
-- The generated event-trigger helper does not need to be callable through RPC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
