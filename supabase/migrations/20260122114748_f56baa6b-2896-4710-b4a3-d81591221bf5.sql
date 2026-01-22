-- Drop the recursive policy that's causing infinite recursion
DROP POLICY IF EXISTS "Reviewers can view assigned bookings" ON public.interview_bookings;

-- Create a SECURITY DEFINER function to check reviewer assignment
-- This bypasses RLS during the check to avoid recursion
CREATE OR REPLACE FUNCTION public.is_reviewer_assigned_to_booking(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_reviewers br
    JOIN panel_reviewers pr ON pr.id = br.reviewer_id
    WHERE br.booking_id = p_booking_id
      AND pr.user_id = auth.uid()
      AND pr.is_active = true
  )
$$;

-- Create new non-recursive SELECT policy using the helper function
CREATE POLICY "Reviewers can view assigned bookings"
  ON public.interview_bookings
  FOR SELECT
  USING (public.is_reviewer_assigned_to_booking(id));