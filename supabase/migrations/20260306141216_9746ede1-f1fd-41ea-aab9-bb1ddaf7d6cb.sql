
-- Add admin_tier to platform_admin_profiles
ALTER TABLE public.platform_admin_profiles
  ADD COLUMN IF NOT EXISTS admin_tier TEXT NOT NULL DEFAULT 'admin'
  CHECK (admin_tier IN ('supervisor', 'senior_admin', 'admin'));

-- Migrate existing is_supervisor data
UPDATE public.platform_admin_profiles
  SET admin_tier = 'supervisor'
  WHERE is_supervisor = TRUE;

-- Add admin_tier to admin_access_codes
ALTER TABLE public.admin_access_codes
  ADD COLUMN IF NOT EXISTS admin_tier TEXT NOT NULL DEFAULT 'admin'
  CHECK (admin_tier IN ('supervisor', 'senior_admin', 'admin'));

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_pap_admin_tier ON public.platform_admin_profiles(admin_tier);

-- Trigger: enforce tier hierarchy on insert/update
CREATE OR REPLACE FUNCTION public.fn_guard_tier_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tier TEXT;
  v_supervisor_count INTEGER;
BEGIN
  -- On UPDATE: prevent demoting last supervisor
  IF TG_OP = 'UPDATE' AND OLD.admin_tier = 'supervisor' AND NEW.admin_tier != 'supervisor' THEN
    SELECT COUNT(*) INTO v_supervisor_count
    FROM platform_admin_profiles
    WHERE admin_tier = 'supervisor'
      AND id != OLD.id
      AND availability_status != 'Inactive';

    IF v_supervisor_count < 1 THEN
      RAISE EXCEPTION 'Cannot demote the last active supervisor';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pap_guard_tier_hierarchy ON public.platform_admin_profiles;
CREATE TRIGGER trg_pap_guard_tier_hierarchy
  BEFORE INSERT OR UPDATE OF admin_tier ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_tier_hierarchy();
