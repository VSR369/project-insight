-- Fix RLS policy on solution_provider_invitations to use JWT claims instead of auth.users
-- This prevents "permission denied for table users" error

DROP POLICY IF EXISTS "Users view own invitations" ON public.solution_provider_invitations;

CREATE POLICY "Users view own invitations" ON public.solution_provider_invitations
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email'));