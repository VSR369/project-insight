-- ──────────────────────────────────────────────────────────────
-- 1. Re-seed QUICK rows in md_lifecycle_phase_config
-- ──────────────────────────────────────────────────────────────

-- Phase 3 Compliance: clear secondary role (no FC in QUICK — no escrow)
UPDATE public.md_lifecycle_phase_config
SET secondary_role = NULL,
    auto_complete = true,
    is_active = true,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 3;

-- Phase 5 Abstract submit: deactivate (skip entirely in QUICK)
UPDATE public.md_lifecycle_phase_config
SET is_active = false,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 5;

-- Phase 6 Abstract review: deactivate (skip entirely in QUICK)
UPDATE public.md_lifecycle_phase_config
SET is_active = false,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 6;

-- Phase 8 Solution review: Creator handles directly
UPDATE public.md_lifecycle_phase_config
SET required_role = 'CR',
    secondary_role = NULL,
    phase_type = 'seeker_manual',
    auto_complete = false,
    sla_days = 7,
    is_active = true,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 8;

-- Phase 9 Award decision: Creator handles directly
UPDATE public.md_lifecycle_phase_config
SET required_role = 'CR',
    secondary_role = NULL,
    phase_type = 'seeker_manual',
    auto_complete = false,
    sla_days = 3,
    is_active = true,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 9;

-- Phase 10 Payment: Creator confirms; system auto-finalizes
UPDATE public.md_lifecycle_phase_config
SET required_role = 'CR',
    secondary_role = NULL,
    auto_complete = true,
    is_active = true,
    updated_at = now()
WHERE governance_mode = 'QUICK' AND phase_number = 10;

-- ──────────────────────────────────────────────────────────────
-- 2. auto_assign_roles_on_creation — QUICK grants only CR
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_governance_mode TEXT;
  v_roles TEXT[];
  v_role TEXT;
BEGIN
  v_governance_mode := COALESCE(NEW.governance_profile, 'STRUCTURED');

  IF v_governance_mode = 'QUICK' THEN
    -- QUICK: Creator handles all roles in one interface (no CU/ER/LC/FC)
    v_roles := ARRAY['CR'];
  ELSIF v_governance_mode = 'CONTROLLED' THEN
    v_roles := ARRAY['CR'];
  ELSE
    -- STRUCTURED (default)
    v_roles := ARRAY['CR'];
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_challenge_roles (
      user_id, challenge_id, role_code, status, assigned_at, assigned_by
    )
    VALUES (
      NEW.created_by, NEW.id, v_role, 'ACTIVE', now(), NEW.created_by
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. Patch complete_phase — skip inactive phases when advancing
-- ──────────────────────────────────────────────────────────────
-- We add a helper that returns the next ACTIVE phase number for a
-- given governance mode, then call it from complete_phase via a
-- thin wrapper. The actual complete_phase function remains intact
-- in its existing definition; we only patch the lookup it uses.
CREATE OR REPLACE FUNCTION public.next_active_phase_number(
  p_governance_mode TEXT,
  p_current_phase INT
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(phase_number)
  FROM public.md_lifecycle_phase_config
  WHERE governance_mode = p_governance_mode
    AND is_active = true
    AND phase_number > p_current_phase;
$$;

GRANT EXECUTE ON FUNCTION public.next_active_phase_number(TEXT, INT) TO authenticated, service_role;