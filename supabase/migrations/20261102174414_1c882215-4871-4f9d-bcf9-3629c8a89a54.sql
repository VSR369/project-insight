GRANT EXECUTE ON FUNCTION public.fn_has_accepted_cpa(uuid, uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.fn_is_challenge_winner(uuid, uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.fn_is_challenge_privileged(uuid, uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.get_provider_challenge_view(uuid) TO supabase_read_only_user;
GRANT EXECUTE ON FUNCTION public.log_confidential_content_access(uuid, uuid, text) TO supabase_read_only_user;