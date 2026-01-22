-- =====================================================
-- Fix: Allow reviewers to view provider data for their assigned enrollments
-- Creates a SECURITY DEFINER helper function and adds RLS policies
-- =====================================================

-- 1. Create helper function to check if current user is a reviewer for a provider
CREATE OR REPLACE FUNCTION public.is_reviewer_for_provider(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM panel_reviewers pr
    INNER JOIN booking_reviewers br ON br.reviewer_id = pr.id
    INNER JOIN interview_bookings ib ON ib.id = br.booking_id
    INNER JOIN provider_industry_enrollments pie ON pie.id = ib.enrollment_id
    WHERE pr.user_id = auth.uid()
      AND pie.provider_id = p_provider_id
      AND pr.is_active = true
  )
$$;

-- 2. Create helper function to check if current user is a reviewer for an enrollment
CREATE OR REPLACE FUNCTION public.is_reviewer_for_enrollment(p_enrollment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM panel_reviewers pr
    INNER JOIN booking_reviewers br ON br.reviewer_id = pr.id
    INNER JOIN interview_bookings ib ON ib.id = br.booking_id
    WHERE pr.user_id = auth.uid()
      AND ib.enrollment_id = p_enrollment_id
      AND pr.is_active = true
  )
$$;

-- 3. Add RLS policy on solution_providers for reviewers
CREATE POLICY "Reviewers can view assigned providers"
ON public.solution_providers
FOR SELECT
USING (public.is_reviewer_for_provider(id));

-- 4. Add RLS policy on provider_industry_enrollments for reviewers
CREATE POLICY "Reviewers can view assigned enrollments"
ON public.provider_industry_enrollments
FOR SELECT
USING (public.is_reviewer_for_enrollment(id));