
-- ============================================================================
-- BR-CORE-004: check_model_authority() — blocks PA from AGG role operations
-- BR-CORE-002: fn_guard_last_active_core_role() — prevents last-active deactivation
-- ============================================================================

-- 1. check_model_authority: Returns true if the caller can manage roles for the given model
-- PA can manage 'mp' and 'both'; only SOA can manage 'agg'
CREATE OR REPLACE FUNCTION public.check_model_authority(
  p_user_id UUID,
  p_engagement_model TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_platform_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
BEGIN
  -- Check if user is a Platform Admin (has entry in user_roles)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- Check if user is a Seeking Org Admin
  SELECT EXISTS (
    SELECT 1 FROM public.seeking_org_admins
    WHERE user_id = p_user_id AND status = 'active'
  ) INTO v_is_org_admin;

  -- Platform Admin: can manage 'mp' and 'both', BLOCKED from 'agg'
  IF v_is_platform_admin AND NOT v_is_org_admin THEN
    RETURN p_engagement_model IN ('mp', 'both');
  END IF;

  -- SOA: can manage 'agg' and 'both'
  IF v_is_org_admin THEN
    RETURN p_engagement_model IN ('agg', 'both');
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Guard trigger: prevent deactivation of the last Active user for a core role
CREATE OR REPLACE FUNCTION public.fn_guard_last_active_core_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_core BOOLEAN;
  v_active_count INTEGER;
BEGIN
  -- Only fire on status change TO inactive/suspended/expired
  IF OLD.status = 'active' AND NEW.status IN ('inactive', 'suspended', 'expired') THEN
    -- Check if this role_code is a core role
    SELECT is_core INTO v_is_core
    FROM public.md_slm_role_codes
    WHERE code = OLD.role_code;

    IF v_is_core = true THEN
      -- Count remaining active assignments for same org + role (excluding this one)
      SELECT COUNT(*) INTO v_active_count
      FROM public.role_assignments
      WHERE org_id = OLD.org_id
        AND role_code = OLD.role_code
        AND status = 'active'
        AND id != OLD.id;

      IF v_active_count = 0 THEN
        RAISE EXCEPTION 'Cannot deactivate the last active user for core role %. At least one active assignment is required.', OLD.role_code;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_guard_last_active_core_role ON public.role_assignments;
CREATE TRIGGER trg_guard_last_active_core_role
  BEFORE UPDATE ON public.role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_last_active_core_role();
