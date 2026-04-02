-- Drop the old 4-parameter overload (without p_governance_mode_override)
DROP FUNCTION IF EXISTS public.initialize_challenge(uuid, uuid, text, text);