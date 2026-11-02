GRANT EXECUTE ON FUNCTION public.fn_provider_can_view_challenge(uuid, text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.provider_challenge_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.invite_provider_to_challenge(uuid, uuid) TO service_role;