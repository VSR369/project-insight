-- ============================================================
-- 1.1 New table: md_governance_mode_config
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_governance_mode_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_mode TEXT NOT NULL UNIQUE CHECK (governance_mode IN ('QUICK','STRUCTURED','CONTROLLED')),
  legal_doc_mode TEXT NOT NULL DEFAULT 'auto_apply' 
    CHECK (legal_doc_mode IN ('auto_apply','manual_review','ai_review')),
  legal_doc_editable BOOLEAN NOT NULL DEFAULT FALSE,
  legal_doc_creation_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_legal_review_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  escrow_mode TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (escrow_mode IN ('not_applicable','optional','mandatory')),
  curation_checklist_items INTEGER NOT NULL DEFAULT 7,
  ai_curation_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  dual_curation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_modification_cycles INTEGER NOT NULL DEFAULT 3,
  dual_evaluation_required BOOLEAN NOT NULL DEFAULT FALSE,
  blind_evaluation BOOLEAN NOT NULL DEFAULT FALSE,
  dual_signoff_required BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.md_governance_mode_config (
  governance_mode, legal_doc_mode, legal_doc_editable, legal_doc_creation_allowed, ai_legal_review_enabled,
  escrow_mode, curation_checklist_items, ai_curation_review_required, dual_curation_enabled, max_modification_cycles,
  dual_evaluation_required, blind_evaluation, dual_signoff_required,
  display_name, description, target_audience, display_order
) VALUES
( 'QUICK', 'auto_apply', false, false, false, 'not_applicable', 7, false, false, 2, false, false, false,
  'Quick', 'Simplified workflow. Platform defaults protect the solo founder. All roles converge to one person.', 'Startups, solo founders, MVPs', 1 ),
( 'STRUCTURED', 'manual_review', true, false, false, 'optional', 14, false, false, 3, false, false, false,
  'Structured', 'Balanced governance. Creator, Curator, and Expert Reviewer must be separate people.', 'MSMEs, growth-stage teams', 2 ),
( 'CONTROLLED', 'ai_review', true, true, true, 'mandatory', 14, true, true, 3, true, true, true,
  'Controlled', 'Full compliance. Strict separation of duties. AI-powered legal review. Mandatory escrow.', 'Enterprises, regulated industries', 3 )
ON CONFLICT (governance_mode) DO NOTHING;

-- ============================================================
-- 1.2 New table: md_tier_governance_access
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_tier_governance_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code TEXT NOT NULL,
  governance_mode TEXT NOT NULL CHECK (governance_mode IN ('QUICK','STRUCTURED','CONTROLLED')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (tier_code, governance_mode)
);

INSERT INTO public.md_tier_governance_access (tier_code, governance_mode, is_default) VALUES
  ('basic', 'QUICK', true),
  ('standard', 'QUICK', false), ('standard', 'STRUCTURED', true),
  ('premium', 'QUICK', false), ('premium', 'STRUCTURED', true), ('premium', 'CONTROLLED', false),
  ('enterprise', 'QUICK', false), ('enterprise', 'STRUCTURED', false), ('enterprise', 'CONTROLLED', true)
ON CONFLICT (tier_code, governance_mode) DO NOTHING;

-- ============================================================
-- 1.3 Fix role_conflict_rules — DELETE first, then fix constraints
-- ============================================================
DELETE FROM public.role_conflict_rules;

ALTER TABLE public.role_conflict_rules DROP CONSTRAINT IF EXISTS role_conflict_rules_governance_profile_check;
ALTER TABLE public.role_conflict_rules DROP CONSTRAINT IF EXISTS role_conflict_rules_conflict_type_check;

ALTER TABLE public.role_conflict_rules 
  ADD CONSTRAINT role_conflict_rules_governance_profile_check 
  CHECK (governance_profile IN ('QUICK','STRUCTURED','CONTROLLED'));
ALTER TABLE public.role_conflict_rules 
  ADD CONSTRAINT role_conflict_rules_conflict_type_check 
  CHECK (conflict_type IN ('HARD_BLOCK','ALLOWED'));

INSERT INTO public.role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile, is_active)
VALUES
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'STRUCTURED', true),
  ('CR', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'STRUCTURED', true),
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CR', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CR', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('CU', 'ER', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('ER', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true),
  ('LC', 'FC', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED', true);

-- ============================================================
-- 1.4 Deactivate dead roles + clean governance names
-- ============================================================
UPDATE public.platform_roles SET is_active = false, updated_at = NOW()
WHERE role_code IN ('AM','RQ','ID','CA');

UPDATE public.seeker_organizations 
SET governance_profile = CASE governance_profile
  WHEN 'ENTERPRISE' THEN 'STRUCTURED' WHEN 'LIGHTWEIGHT' THEN 'QUICK'
  ELSE governance_profile END, updated_at = NOW()
WHERE governance_profile IN ('ENTERPRISE','LIGHTWEIGHT');

UPDATE public.challenges
SET governance_profile = CASE governance_profile
  WHEN 'ENTERPRISE' THEN 'STRUCTURED' WHEN 'LIGHTWEIGHT' THEN 'QUICK'
  ELSE governance_profile END, updated_at = NOW()
WHERE governance_profile IN ('ENTERPRISE','LIGHTWEIGHT');

UPDATE public.challenges
SET governance_mode_override = CASE governance_mode_override
  WHEN 'ENTERPRISE' THEN 'STRUCTURED' WHEN 'LIGHTWEIGHT' THEN 'QUICK'
  ELSE governance_mode_override END, updated_at = NOW()
WHERE governance_mode_override IN ('ENTERPRISE','LIGHTWEIGHT');

UPDATE public.user_challenge_roles SET role_code = 'CR' WHERE role_code IN ('AM','CA','RQ');
UPDATE public.user_challenge_roles SET role_code = 'CU' WHERE role_code = 'ID';

-- ============================================================
-- 1.5 Phase 2 compliance flags
-- ============================================================
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS lc_compliance_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS fc_compliance_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 1.6 Fix challenge_role_assignments constraints
-- ============================================================
ALTER TABLE public.challenge_role_assignments DROP CONSTRAINT IF EXISTS challenge_role_assignments_role_code_check;
ALTER TABLE public.challenge_role_assignments 
  ADD CONSTRAINT challenge_role_assignments_role_code_check 
  CHECK (role_code IN ('R3','R4','R5_MP','R5_AGG','R7_MP','R7_AGG','R8','R9','R10_CR'));

ALTER TABLE public.challenge_role_assignments DROP CONSTRAINT IF EXISTS challenge_role_assignments_assignment_phase_check;
ALTER TABLE public.challenge_role_assignments 
  ADD CONSTRAINT challenge_role_assignments_assignment_phase_check 
  CHECK (assignment_phase IN ('compliance','curation','abstract_review','solution_review','award','payment'));

ALTER TABLE public.challenge_role_assignments DROP CONSTRAINT IF EXISTS challenge_role_assignments_status_check;
ALTER TABLE public.challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_status_check
  CHECK (status IN ('active','reassigned','completed','cancelled'));

-- ============================================================
-- 1.7 Rewrite get_phase_required_role — 10 phases
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_phase_required_role(p_phase integer)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE p_phase
    WHEN 1 THEN 'CR' WHEN 2 THEN 'LC' WHEN 3 THEN 'CU'
    WHEN 4 THEN NULL WHEN 5 THEN NULL WHEN 6 THEN 'ER'
    WHEN 7 THEN NULL WHEN 8 THEN 'ER' WHEN 9 THEN 'CU'
    WHEN 10 THEN 'FC' ELSE NULL
  END;
$$;

-- ============================================================
-- 1.8 Rewrite validate_role_assignment — DROP old, CREATE new (binary only)
-- ============================================================
DROP FUNCTION IF EXISTS public.validate_role_assignment(uuid, uuid, text, text);

CREATE FUNCTION public.validate_role_assignment(
  p_user_id uuid, p_challenge_id uuid, p_new_role text, p_governance_profile text
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing_roles text[];
  v_role text;
  v_found boolean;
BEGIN
  IF p_governance_profile = 'QUICK' THEN
    RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
  END IF;

  SELECT array_agg(role_code) INTO v_existing_roles
  FROM public.user_challenge_roles
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND is_active = true;

  IF v_existing_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
  END IF;

  FOREACH v_role IN ARRAY v_existing_roles LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.role_conflict_rules
      WHERE ((role_a = v_role AND role_b = p_new_role) OR (role_a = p_new_role AND role_b = v_role))
        AND applies_scope = 'SAME_CHALLENGE'
        AND governance_profile = p_governance_profile
        AND conflict_type = 'HARD_BLOCK'
        AND is_active = true
    ) INTO v_found;

    IF v_found THEN
      RETURN jsonb_build_object(
        'allowed', false, 'conflict_type', 'HARD_BLOCK',
        'message', format('%s + %s is blocked under %s governance. Assign a different person.', v_role, p_new_role, p_governance_profile)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
END;
$$;

-- ============================================================
-- 1.9 Remap existing challenges from 13-phase to 10-phase
-- ============================================================
UPDATE public.challenges SET current_phase = CASE current_phase
  WHEN 1 THEN 1 WHEN 2 THEN 1 WHEN 3 THEN 3 WHEN 4 THEN 3
  WHEN 5 THEN 4 WHEN 7 THEN 5 WHEN 8 THEN 6 WHEN 9 THEN 7
  WHEN 10 THEN 8 WHEN 11 THEN 9 WHEN 12 THEN 10 WHEN 13 THEN 10
  ELSE current_phase
END, updated_at = NOW()
WHERE current_phase IS NOT NULL;

-- ============================================================
-- 1.10 RLS for new tables
-- ============================================================
ALTER TABLE public.md_governance_mode_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read governance config" ON public.md_governance_mode_config FOR SELECT USING (true);
CREATE POLICY "Supervisors can edit governance config" ON public.md_governance_mode_config
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE user_id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')));

ALTER TABLE public.md_tier_governance_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tier access" ON public.md_tier_governance_access FOR SELECT USING (true);
CREATE POLICY "Supervisors can edit tier access" ON public.md_tier_governance_access
  FOR ALL USING (EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE user_id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')));