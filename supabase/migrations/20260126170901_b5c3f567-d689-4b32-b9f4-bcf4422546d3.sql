-- =====================================================
-- Fix: Add Reviewer RLS Policies for Candidate Detail Page
-- Allows reviewers to view/update provider data for assigned enrollments
-- =====================================================

-- =====================================================
-- Phase 1: Proof Points Access (SELECT + UPDATE)
-- =====================================================

-- 1.1 proof_points - SELECT
CREATE POLICY "Reviewers can view assigned proof points"
  ON public.proof_points
  FOR SELECT
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id));

-- 1.2 proof_points - UPDATE (for rating/review columns)
CREATE POLICY "Reviewers can update proof point ratings"
  ON public.proof_points
  FOR UPDATE
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id))
  WITH CHECK (is_reviewer_for_enrollment(enrollment_id));

-- 1.3 proof_point_links - SELECT
CREATE POLICY "Reviewers can view proof point links"
  ON public.proof_point_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_links.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );

-- 1.4 proof_point_files - SELECT
CREATE POLICY "Reviewers can view proof point files"
  ON public.proof_point_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_files.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );

-- 1.5 proof_point_speciality_tags - SELECT
CREATE POLICY "Reviewers can view proof point tags"
  ON public.proof_point_speciality_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_speciality_tags.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );

-- =====================================================
-- Phase 2: Assessment Access (SELECT only)
-- =====================================================

-- 2.1 assessment_attempts - SELECT
CREATE POLICY "Reviewers can view assigned assessment attempts"
  ON public.assessment_attempts
  FOR SELECT
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id));

-- 2.2 assessment_attempt_responses - SELECT
CREATE POLICY "Reviewers can view assigned assessment responses"
  ON public.assessment_attempt_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      WHERE aa.id = assessment_attempt_responses.attempt_id
        AND is_reviewer_for_enrollment(aa.enrollment_id)
    )
  );

-- =====================================================
-- Phase 3: Expertise/Proficiency Access (SELECT only)
-- =====================================================

-- 3.1 provider_proficiency_areas - SELECT
CREATE POLICY "Reviewers can view assigned proficiency areas"
  ON public.provider_proficiency_areas
  FOR SELECT
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id));

-- 3.2 provider_specialities - SELECT
CREATE POLICY "Reviewers can view assigned specialities"
  ON public.provider_specialities
  FOR SELECT
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id));

-- =====================================================
-- Phase 4: Enrollment UPDATE Policy
-- =====================================================

-- 4.1 provider_industry_enrollments - UPDATE (for review status fields)
CREATE POLICY "Reviewers can update review fields on assigned enrollments"
  ON public.provider_industry_enrollments
  FOR UPDATE
  TO authenticated
  USING (is_reviewer_for_enrollment(id))
  WITH CHECK (is_reviewer_for_enrollment(id));