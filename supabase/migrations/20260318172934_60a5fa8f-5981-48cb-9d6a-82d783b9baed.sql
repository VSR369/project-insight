
-- Fix: Drop the duplicate overloaded initialize_challenge function
-- There are two overloads with same parameter types but different ordering,
-- causing a 300 "ambiguous function" error.
-- Keep the signature matching useSubmitSolutionRequest.ts call: (p_org_id, p_creator_id, p_title, p_operating_model)
DROP FUNCTION IF EXISTS public.initialize_challenge(uuid, text, text, uuid);
