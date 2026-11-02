-- 1. Normalize challenges.visibility to the three BR-CHL-P10 options
UPDATE public.challenges SET visibility = 'invite_only' WHERE visibility = 'invited_only';
UPDATE public.challenges SET visibility = 'eligible_certified' WHERE visibility IS NULL OR visibility IN ('private','registered_users','platform_members','curated_experts');
ALTER TABLE public.challenges ALTER COLUMN visibility SET DEFAULT 'eligible_certified';
ALTER TABLE public.challenges ADD CONSTRAINT chk_challenges_visibility CHECK (visibility IN ('eligible_certified','invite_only','public'));

-- 2. Minimum expertise level (L1-L4, default L1)
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS min_expertise_level integer NOT NULL DEFAULT 1;
ALTER TABLE public.challenges ADD CONSTRAINT chk_challenges_min_expertise_level CHECK (min_expertise_level BETWEEN 1 AND 4);

-- 3. Recorded invitations for invite-only challenges
CREATE TABLE IF NOT EXISTS public.challenge_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_challenge_invitations_status CHECK (status IN ('invited','accepted','declined','expired','revoked')),
  CONSTRAINT uq_challenge_invitations UNIQUE (challenge_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_invitations_challenge ON public.challenge_invitations (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_invitations_provider ON public.challenge_invitations (provider_id);
GRANT SELECT ON public.challenge_invitations TO authenticated;
GRANT ALL ON public.challenge_invitations TO service_role;
ALTER TABLE public.challenge_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers, challenge team and tenant see invitations" ON public.challenge_invitations
  FOR SELECT TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
    OR has_active_challenge_role(challenge_id, auth.uid())
    OR has_role(auth.uid(), 'platform_admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.tenant_id = get_user_tenant_id())
  );

-- 4. Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_challenge_invitations_before_update_set_updated_at ON public.challenge_invitations;
CREATE TRIGGER trg_challenge_invitations_before_update_set_updated_at
  BEFORE UPDATE ON public.challenge_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Core BR-CHL-P10 rule: may this provider see/join this challenge?
CREATE OR REPLACE FUNCTION public.fn_provider_can_view_challenge(
  p_challenge_id uuid,
  p_visibility text,
  p_industry_segment_id uuid,
  p_min_level integer
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_visibility IS NULL OR p_visibility = 'public' THEN true
    WHEN p_visibility = 'invite_only' THEN EXISTS (
      SELECT 1
      FROM public.challenge_invitations ci
      JOIN public.solution_providers sp ON sp.id = ci.provider_id
      WHERE ci.challenge_id = p_challenge_id
        AND sp.user_id = auth.uid()
        AND ci.status IN ('invited','accepted')
        AND (ci.valid_until IS NULL OR ci.valid_until > now())
    )
    ELSE EXISTS (
      SELECT 1
      FROM public.provider_industry_enrollments e
      JOIN public.solution_providers sp ON sp.id = e.provider_id
      JOIN public.expertise_levels el ON el.id = e.expertise_level_id
      WHERE sp.user_id = auth.uid()
        AND e.lifecycle_status = 'certified'
        AND (p_industry_segment_id IS NULL OR e.industry_segment_id = p_industry_segment_id)
        AND el.level_number >= COALESCE(p_min_level, 1)
    )
  END
$$;
GRANT EXECUTE ON FUNCTION public.fn_provider_can_view_challenge(uuid, text, uuid, integer) TO authenticated;

-- 6. Access check RPC for the challenge detail page (returns reason for messaging)
CREATE OR REPLACE FUNCTION public.provider_challenge_access(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.challenges%ROWTYPE;
  v_industry text;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id AND is_deleted = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_found');
  END IF;

  IF has_role(auth.uid(), 'platform_admin'::app_role)
     OR has_active_challenge_role(c.id, auth.uid())
     OR c.tenant_id = get_user_tenant_id() THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'privileged');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.user_id = auth.uid()) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_provider_record');
  END IF;

  SELECT name INTO v_industry FROM public.industry_segments WHERE id = c.industry_segment_id;

  IF c.visibility IS NULL OR c.visibility = 'public' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'public');
  END IF;

  IF fn_provider_can_view_challenge(c.id, c.visibility, c.industry_segment_id, c.min_expertise_level) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', CASE WHEN c.visibility = 'invite_only' THEN 'invited' ELSE 'certified' END);
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', CASE WHEN c.visibility = 'invite_only' THEN 'not_invited' ELSE 'not_certified' END,
    'industry_name', v_industry
  );
END $$;
GRANT EXECUTE ON FUNCTION public.provider_challenge_access(uuid) TO authenticated;

-- 7. Record an invitation (Curator / Creator / platform admin only)
CREATE OR REPLACE FUNCTION public.invite_provider_to_challenge(p_challenge_id uuid, p_provider_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.challenges%ROWTYPE;
  v_valid_until timestamptz;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id AND is_deleted = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  IF NOT (has_role(auth.uid(), 'platform_admin'::app_role)
          OR has_active_challenge_role(c.id, auth.uid())
          OR c.tenant_id = get_user_tenant_id()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.solution_providers WHERE id = p_provider_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_not_found');
  END IF;

  v_valid_until := c.submission_deadline;

  INSERT INTO public.challenge_invitations (challenge_id, provider_id, invited_by, valid_until, status)
  VALUES (p_challenge_id, p_provider_id, auth.uid(), v_valid_until, 'invited')
  ON CONFLICT (challenge_id, provider_id)
  DO UPDATE SET status = 'invited', invited_by = auth.uid(), invited_at = now(), valid_until = v_valid_until;

  RETURN jsonb_build_object('success', true, 'valid_until', v_valid_until);
END $$;
GRANT EXECUTE ON FUNCTION public.invite_provider_to_challenge(uuid, uuid) TO authenticated;

-- 8. Extend the read policy: providers see only published challenges they are eligible for (BR-CHL-P10)
DROP POLICY IF EXISTS challenges_select_policy ON public.challenges;
CREATE POLICY challenges_select_policy ON public.challenges FOR SELECT USING (
  (tenant_id = get_user_tenant_id())
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_active_challenge_role(id, auth.uid())
  OR (
    is_deleted = false
    AND published_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.user_id = auth.uid())
    AND public.fn_provider_can_view_challenge(id, visibility, industry_segment_id, min_expertise_level)
  )
);