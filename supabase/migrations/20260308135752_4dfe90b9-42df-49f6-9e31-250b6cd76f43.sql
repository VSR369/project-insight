-- GAP-2/GAP-3: Harden Open Queue RLS policies (BR-MPA-020)
-- Admins On_Leave or Inactive must not see or claim queue entries.
-- Supervisors retain monitoring access regardless of status.

-- Drop existing policies
DROP POLICY IF EXISTS "oqe_select" ON public.open_queue_entries;
DROP POLICY IF EXISTS "oqe_claim" ON public.open_queue_entries;

-- Recreate SELECT policy: Available/Partially_Available admins + all supervisors
CREATE POLICY "oqe_select" ON public.open_queue_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND (
          pap.admin_tier = 'supervisor'
          OR pap.availability_status IN ('Available', 'Partially_Available')
        )
    )
    AND has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Recreate UPDATE (claim) policy: Only Available/Partially_Available admins can claim
-- Supervisors can claim too but only if Available/Partially_Available
CREATE POLICY "oqe_claim" ON public.open_queue_entries
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND claimed_by IS NULL
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles pap
      WHERE pap.user_id = auth.uid()
        AND pap.availability_status IN ('Available', 'Partially_Available')
    )
  )
  WITH CHECK (
    claimed_by IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  );
