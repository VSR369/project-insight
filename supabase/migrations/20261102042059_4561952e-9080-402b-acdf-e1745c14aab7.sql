REVOKE EXECUTE ON FUNCTION public.fn_provider_can_view_challenge(uuid, text, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.provider_challenge_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invite_provider_to_challenge(uuid, uuid) FROM PUBLIC, anon;