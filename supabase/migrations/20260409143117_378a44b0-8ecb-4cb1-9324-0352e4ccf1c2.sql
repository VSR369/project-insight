
-- Part H: Ensure pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Part A: Freeze/lock columns on challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS curation_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS curation_frozen_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS legal_review_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS curation_lock_status TEXT NOT NULL DEFAULT 'OPEN';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_challenges_curation_lock_status'
  ) THEN
    ALTER TABLE public.challenges
      ADD CONSTRAINT chk_challenges_curation_lock_status
      CHECK (curation_lock_status IN ('OPEN', 'FROZEN', 'RETURNED'));
  END IF;
END $$;

-- Part B: Content/assembly columns on challenge_legal_docs
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS assembled_from_template_id UUID,
  ADD COLUMN IF NOT EXISTS assembly_variables JSONB,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_assembled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Part D: freeze_for_legal_review RPC
CREATE OR REPLACE FUNCTION public.freeze_for_legal_review(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_hash TEXT;
  v_hash_input TEXT;
BEGIN
  SELECT id, current_phase, curation_lock_status, title,
         problem_statement, scope, hook, ip_model, evaluation_criteria
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.current_phase IS DISTINCT FROM 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge must be in Phase 2 (Curation)');
  END IF;

  IF v_challenge.curation_lock_status = 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is already frozen');
  END IF;

  v_hash_input := COALESCE(v_challenge.title, '') || '|' ||
                   COALESCE(v_challenge.problem_statement, '') || '|' ||
                   COALESCE(v_challenge.scope, '') || '|' ||
                   COALESCE(v_challenge.hook, '') || '|' ||
                   COALESCE(v_challenge.ip_model, '') || '|' ||
                   COALESCE(v_challenge.evaluation_criteria::text, '');

  v_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  UPDATE public.challenges
  SET curation_lock_status = 'FROZEN',
      curation_frozen_at = NOW(),
      curation_frozen_by = p_user_id,
      legal_review_content_hash = v_hash,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CURATION_FROZEN', 'RPC', p_user_id, p_challenge_id,
    jsonb_build_object('content_hash', v_hash, 'frozen_at', NOW()::text)
  );

  RETURN jsonb_build_object('success', true, 'content_hash', v_hash);
END;
$$;

-- Part E: unfreeze_for_recuration RPC
CREATE OR REPLACE FUNCTION public.unfreeze_for_recuration(
  p_challenge_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT id, curation_lock_status
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.curation_lock_status != 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is not frozen');
  END IF;

  UPDATE public.challenges
  SET curation_lock_status = 'RETURNED',
      curation_frozen_at = NULL,
      curation_frozen_by = NULL,
      legal_review_content_hash = NULL,
      current_phase = 2,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  DELETE FROM public.challenge_legal_docs
  WHERE challenge_id = p_challenge_id AND is_assembled = true;

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CURATION_UNFROZEN', 'RPC', p_user_id, p_challenge_id,
    jsonb_build_object('reason', COALESCE(p_reason, 'No reason provided'), 'returned_at', NOW()::text)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Part F: assemble_cpa RPC
CREATE OR REPLACE FUNCTION public.assemble_cpa(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_org RECORD;
  v_gov_mode TEXT;
  v_cpa_code TEXT;
  v_template RECORD;
  v_content TEXT;
  v_variables JSONB;
  v_geo RECORD;
  v_doc_id UUID;
BEGIN
  SELECT c.id, c.title, c.organization_id, c.tenant_id, c.problem_statement,
         c.scope, c.ip_model, c.hook, c.evaluation_criteria,
         c.governance_mode_override, c.governance_profile,
         c.curation_lock_status, c.current_phase,
         c.total_fee, c.currency_code, c.submission_deadline
  INTO v_challenge
  FROM public.challenges c
  WHERE c.id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  v_gov_mode := COALESCE(v_challenge.governance_mode_override, v_challenge.governance_profile, 'QUICK');

  CASE v_gov_mode
    WHEN 'QUICK' THEN v_cpa_code := 'CPA_QUICK';
    WHEN 'STRUCTURED' THEN v_cpa_code := 'CPA_STRUCTURED';
    WHEN 'CONTROLLED' THEN v_cpa_code := 'CPA_CONTROLLED';
    ELSE v_cpa_code := 'CPA_QUICK';
  END CASE;

  SELECT id, template_content, document_name
  INTO v_template
  FROM public.org_legal_document_templates
  WHERE organization_id = v_challenge.organization_id
    AND document_code = v_cpa_code
    AND is_active = true
    AND version_status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  BEGIN
    SELECT jurisdiction, governing_law
    INTO v_geo
    FROM public.geography_context
    WHERE challenge_id = p_challenge_id
    LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    v_geo := NULL;
  END;

  v_variables := jsonb_build_object(
    'challenge_title', COALESCE(v_challenge.title, ''),
    'problem_statement', COALESCE(v_challenge.problem_statement, ''),
    'scope', COALESCE(v_challenge.scope, ''),
    'ip_model', COALESCE(v_challenge.ip_model, ''),
    'governance_mode', v_gov_mode,
    'total_fee', COALESCE(v_challenge.total_fee::text, '0'),
    'currency', COALESCE(v_challenge.currency_code, 'USD'),
    'submission_deadline', COALESCE(v_challenge.submission_deadline::text, 'TBD'),
    'jurisdiction', COALESCE(v_geo.jurisdiction, 'Not specified'),
    'governing_law', COALESCE(v_geo.governing_law, 'Not specified')
  );

  IF v_template.id IS NOT NULL AND v_template.template_content IS NOT NULL THEN
    v_content := v_template.template_content;
    v_content := REPLACE(v_content, '{{challenge_title}}', v_variables->>'challenge_title');
    v_content := REPLACE(v_content, '{{problem_statement}}', v_variables->>'problem_statement');
    v_content := REPLACE(v_content, '{{scope}}', v_variables->>'scope');
    v_content := REPLACE(v_content, '{{ip_model}}', v_variables->>'ip_model');
    v_content := REPLACE(v_content, '{{governance_mode}}', v_variables->>'governance_mode');
    v_content := REPLACE(v_content, '{{total_fee}}', v_variables->>'total_fee');
    v_content := REPLACE(v_content, '{{currency}}', v_variables->>'currency');
    v_content := REPLACE(v_content, '{{submission_deadline}}', v_variables->>'submission_deadline');
    v_content := REPLACE(v_content, '{{jurisdiction}}', v_variables->>'jurisdiction');
    v_content := REPLACE(v_content, '{{governing_law}}', v_variables->>'governing_law');
  ELSE
    v_content := '# Challenge Participation Agreement (' || v_gov_mode || ')' || E'\n\n' ||
                 '## Challenge: ' || COALESCE(v_challenge.title, 'Untitled') || E'\n\n' ||
                 '### Scope' || E'\n' || COALESCE(v_challenge.scope, 'Not specified') || E'\n\n' ||
                 '### IP Model' || E'\n' || COALESCE(v_challenge.ip_model, 'Not specified') || E'\n\n' ||
                 '### Prize' || E'\n' || COALESCE(v_challenge.total_fee::text, '0') || ' ' || COALESCE(v_challenge.currency_code, 'USD') || E'\n\n' ||
                 '### Jurisdiction' || E'\n' || COALESCE(v_geo.jurisdiction, 'Not specified') || E'\n\n' ||
                 '### Governing Law' || E'\n' || COALESCE(v_geo.governing_law, 'Not specified') || E'\n\n' ||
                 '_This is a system-generated default. Please customize via org templates._';
  END IF;

  v_doc_id := gen_random_uuid();

  INSERT INTO public.challenge_legal_docs (
    id, challenge_id, document_type, document_name, tier,
    content, is_assembled, assembled_from_template_id,
    assembly_variables, status, created_by
  ) VALUES (
    v_doc_id, p_challenge_id, v_cpa_code,
    'Challenge Participation Agreement (' || v_gov_mode || ')',
    'challenge', v_content, true,
    v_template.id, v_variables, 'DRAFT', p_user_id
  );

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CPA_ASSEMBLED', 'RPC', p_user_id, p_challenge_id,
    jsonb_build_object(
      'doc_id', v_doc_id::text,
      'cpa_code', v_cpa_code,
      'from_template', v_template.id IS NOT NULL,
      'governance_mode', v_gov_mode
    )
  );

  RETURN jsonb_build_object('success', true, 'doc_id', v_doc_id::text, 'cpa_code', v_cpa_code);
END;
$$;

-- Part G: Content protection trigger
CREATE OR REPLACE FUNCTION public.fn_prevent_frozen_content_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.curation_lock_status = 'FROZEN' AND (
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.problem_statement IS DISTINCT FROM OLD.problem_statement OR
    NEW.scope IS DISTINCT FROM OLD.scope OR
    NEW.hook IS DISTINCT FROM OLD.hook OR
    NEW.ip_model IS DISTINCT FROM OLD.ip_model OR
    NEW.evaluation_criteria IS DISTINCT FROM OLD.evaluation_criteria
  ) THEN
    IF NEW.curation_lock_status = 'FROZEN' THEN
      RAISE EXCEPTION 'Cannot modify content fields while challenge is frozen for legal review';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_frozen_content_edit ON public.challenges;
CREATE TRIGGER trg_prevent_frozen_content_edit
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_frozen_content_edit();
