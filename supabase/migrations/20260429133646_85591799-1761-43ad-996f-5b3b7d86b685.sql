-- Phase 10c.6 — feature_gates JSONB validation trigger
-- Why a trigger and not a CHECK constraint: CHECK constraints cannot reference
-- other tables. The lookup table md_enterprise_feature_gate_keys is the source
-- of truth for valid keys, so this MUST be a trigger.

CREATE OR REPLACE FUNCTION public.validate_feature_gate_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  bad_value TEXT;
  valid_keys TEXT[];
BEGIN
  -- Empty / NULL gates: nothing to validate.
  IF NEW.feature_gates IS NULL OR NEW.feature_gates = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Snapshot the active key whitelist once per row.
  SELECT array_agg(key)
    INTO valid_keys
    FROM public.md_enterprise_feature_gate_keys
    WHERE is_active = TRUE;

  -- Key whitelist enforcement.
  FOR k IN SELECT jsonb_object_keys(NEW.feature_gates) LOOP
    IF valid_keys IS NULL OR NOT (k = ANY(valid_keys)) THEN
      RAISE EXCEPTION
        'Unknown feature gate key: %. Add it to md_enterprise_feature_gate_keys before use.', k
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  -- Value-type enforcement: every value must be a JSONB boolean.
  SELECT key INTO bad_value
    FROM jsonb_each(NEW.feature_gates)
    WHERE jsonb_typeof(value) <> 'boolean'
    LIMIT 1;

  IF bad_value IS NOT NULL THEN
    RAISE EXCEPTION
      'feature_gates value for key "%" must be a boolean (true/false).', bad_value
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enterprise_agreements_validate_gates
  ON public.enterprise_agreements;

CREATE TRIGGER trg_enterprise_agreements_validate_gates
  BEFORE INSERT OR UPDATE OF feature_gates
  ON public.enterprise_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_feature_gate_keys();

-- Phase 10c.7 — document the activation-authority decision on the FSM.
COMMENT ON FUNCTION public.enforce_enterprise_agreement_fsm() IS
  'Enterprise Agreement FSM. ACTIVATION AUTHORITY (decision of record, Phase 10c.7): '
  'only platform supervisor / senior_admin can transition signed -> active. '
  'Org PRIMARY admins record their signature out-of-band; Platform Admin records '
  'who signed in `signed_by_org_user` when flipping to active. Do not relax this '
  'without a security review.';

-- Rollback (manual):
--   DROP TRIGGER IF EXISTS trg_enterprise_agreements_validate_gates ON public.enterprise_agreements;
--   DROP FUNCTION IF EXISTS public.validate_feature_gate_keys();
--   COMMENT ON FUNCTION public.enforce_enterprise_agreement_fsm() IS NULL;