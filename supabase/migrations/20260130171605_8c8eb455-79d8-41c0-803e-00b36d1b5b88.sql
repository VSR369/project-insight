-- =====================================================
-- Fix Security Warnings for PulsePages tables
-- =====================================================

-- Fix 1: Replace overly permissive INSERT policy on reputation log
-- The WITH CHECK (true) is intentional here as reputation is awarded by triggers,
-- but we should tighten it to only allow inserts for the user's own provider
DROP POLICY IF EXISTS "System can insert reputation logs" ON public.pulse_cards_reputation_log;

CREATE POLICY "Users can insert reputation for own provider" ON public.pulse_cards_reputation_log
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

-- Also need a policy for triggers to work (service role bypass RLS)
-- The triggers use SECURITY DEFINER so they bypass RLS anyway

-- Fix 2: The "Users can read all votes" policy with USING(true) is intentional
-- as votes should be publicly visible for transparency. This is acceptable.

-- Fix 3: The "Anyone can read council members" with USING(true) is intentional
-- as council membership is public information. This is acceptable.

-- Fix 4: The "Public can read moderation actions" with USING(true) is intentional
-- as moderation transparency is a core feature. This is acceptable.

-- Note: The security definer view warning is about existing views, not our new tables
-- The function search path warnings are already fixed in our function definitions