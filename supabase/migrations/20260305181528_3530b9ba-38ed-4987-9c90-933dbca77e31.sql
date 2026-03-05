
-- =====================================================
-- Fix seeking_org_admins: CHECK constraint, partial index, trigger, add column
-- =====================================================

-- (a) Expand CHECK constraint to include 'deactivated'
ALTER TABLE public.seeking_org_admins
  DROP CONSTRAINT IF EXISTS seeking_org_admins_status_check;

ALTER TABLE public.seeking_org_admins
  ADD CONSTRAINT seeking_org_admins_status_check
  CHECK (status IN ('pending_activation', 'active', 'suspended', 'transferred', 'deactivated'));

-- (b) Recreate partial unique index with lowercase values
DROP INDEX IF EXISTS idx_seeking_org_admins_one_primary;

CREATE UNIQUE INDEX idx_seeking_org_admins_one_primary
  ON public.seeking_org_admins (organization_id)
  WHERE admin_tier = 'PRIMARY' AND status IN ('pending_activation', 'active');

-- (c) Fix BR-SOA-011 trigger to use lowercase 'deactivated'
CREATE OR REPLACE FUNCTION public.trg_fn_protect_primary_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only protect PRIMARY tier admins
  IF OLD.admin_tier != 'PRIMARY' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Block DELETE of primary admin without accepted transfer
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_transfer_requests
      WHERE organization_id = OLD.organization_id
        AND status = 'accepted'
        AND created_at > NOW() - INTERVAL '30 days'
    ) THEN
      RAISE EXCEPTION 'Cannot delete PRIMARY admin without an accepted admin transfer request (BR-SOA-011)';
    END IF;
    RETURN OLD;
  END IF;

  -- Block status change to 'deactivated' without accepted transfer
  IF TG_OP = 'UPDATE' AND NEW.status = 'deactivated' AND OLD.status != 'deactivated' THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_transfer_requests
      WHERE organization_id = OLD.organization_id
        AND status = 'accepted'
        AND created_at > NOW() - INTERVAL '30 days'
    ) THEN
      RAISE EXCEPTION 'Cannot deactivate PRIMARY admin without an accepted admin transfer request (BR-SOA-011)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (drop first to be safe)
DROP TRIGGER IF EXISTS trg_seeking_org_admins_protect_primary ON public.seeking_org_admins;

CREATE TRIGGER trg_seeking_org_admins_protect_primary
  BEFORE UPDATE OR DELETE ON public.seeking_org_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_protect_primary_admin();

-- (d) Add designation_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seeking_org_admins'
      AND column_name = 'designation_method'
  ) THEN
    ALTER TABLE public.seeking_org_admins
      ADD COLUMN designation_method TEXT
      CHECK (designation_method IN ('SELF', 'SEPARATE', 'DELEGATED', 'TRANSFER'));
  END IF;
END $$;
