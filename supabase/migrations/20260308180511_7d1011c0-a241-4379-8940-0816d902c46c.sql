
-- ============================================================================
-- Fix: Remove misplaced trigger from platform_admin_profiles
-- fn_sync_admin_workload references OLD.assigned_admin_id which only exists
-- on verification_assignments, not on platform_admin_profiles
-- ============================================================================

DROP TRIGGER IF EXISTS trg_pap_sync_workload ON public.platform_admin_profiles;

-- ============================================================================
-- Phase 1: Create security-definer helper for supervisor tier check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_supervisor_tier(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admin_profiles
    WHERE user_id = p_user_id
      AND (admin_tier = 'supervisor' OR is_supervisor = true)
  );
$$;

-- ============================================================================
-- Phase 1: Backfill is_supervisor from admin_tier
-- ============================================================================

UPDATE public.platform_admin_profiles
SET is_supervisor = true
WHERE admin_tier = 'supervisor' AND is_supervisor = false;

UPDATE public.platform_admin_profiles
SET is_supervisor = false
WHERE admin_tier != 'supervisor' AND is_supervisor = true;

-- ============================================================================
-- Phase 1: Fix platform_admin_profiles write policies
-- ============================================================================

DROP POLICY IF EXISTS "supervisor_insert_profiles" ON public.platform_admin_profiles;
DROP POLICY IF EXISTS "supervisor_update_profiles" ON public.platform_admin_profiles;
DROP POLICY IF EXISTS "supervisor_delete_profiles" ON public.platform_admin_profiles;

CREATE POLICY "supervisor_insert_profiles" ON public.platform_admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND is_supervisor_tier(auth.uid())
  );

CREATE POLICY "supervisor_update_profiles" ON public.platform_admin_profiles
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND (
      is_supervisor_tier(auth.uid())
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "supervisor_delete_profiles" ON public.platform_admin_profiles
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND is_supervisor_tier(auth.uid())
  );

-- ============================================================================
-- Phase 2: Fix admin_notifications INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "system_insert_notifications" ON public.admin_notifications;

CREATE POLICY "system_insert_notifications" ON public.admin_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );
