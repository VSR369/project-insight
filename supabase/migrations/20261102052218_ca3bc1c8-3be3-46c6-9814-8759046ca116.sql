GRANT EXECUTE ON FUNCTION public.fn_provider_can_view_challenge(uuid, text, uuid, integer) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.provider_challenge_access(uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.invite_provider_to_challenge(uuid, uuid) TO supabase_read_only_user;