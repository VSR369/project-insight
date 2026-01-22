-- =====================================================
-- Phase 1: Reviewer Candidates - New Tables
-- Creates proof_point_reviews and interview_evaluations tables
-- for tracking reviewer assessments of provider submissions
-- =====================================================

-- ===========================================
-- Table: proof_point_reviews
-- Tracks reviewer verification of proof points
-- ===========================================
CREATE TABLE IF NOT EXISTS public.proof_point_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_point_id UUID NOT NULL REFERENCES public.proof_points(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.panel_reviewers(id) ON DELETE CASCADE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'needs_revision', 'rejected')),
  evidence_strength VARCHAR(10) 
    CHECK (evidence_strength IN ('high', 'medium', 'low')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(proof_point_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.proof_point_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proof_point_reviews
CREATE POLICY "Reviewers can view their own reviews"
  ON public.proof_point_reviews
  FOR SELECT
  USING (reviewer_id IN (
    SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Reviewers can create reviews for assigned providers"
  ON public.proof_point_reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id IN (
      SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM proof_points pp
      JOIN provider_industry_enrollments pie ON pie.id = pp.enrollment_id
      JOIN interview_bookings ib ON ib.enrollment_id = pie.id
      JOIN booking_reviewers br ON br.booking_id = ib.id
      WHERE pp.id = proof_point_id
      AND br.reviewer_id = proof_point_reviews.reviewer_id
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON public.proof_point_reviews
  FOR UPDATE
  USING (reviewer_id IN (
    SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Admins can manage all reviews"
  ON public.proof_point_reviews
  FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Indexes for proof_point_reviews
CREATE INDEX IF NOT EXISTS idx_proof_point_reviews_proof_point 
  ON public.proof_point_reviews(proof_point_id);
CREATE INDEX IF NOT EXISTS idx_proof_point_reviews_reviewer 
  ON public.proof_point_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_proof_point_reviews_status 
  ON public.proof_point_reviews(verification_status);

-- ===========================================
-- Table: interview_evaluations
-- Tracks reviewer scoring of interviews
-- ===========================================
CREATE TABLE IF NOT EXISTS public.interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.interview_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.panel_reviewers(id) ON DELETE CASCADE,
  overall_score NUMERIC(3,1) CHECK (overall_score >= 0 AND overall_score <= 10),
  notes TEXT,
  outcome VARCHAR(20) CHECK (outcome IN ('pass', 'fail', 'needs_follow_up')),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(booking_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_evaluations
CREATE POLICY "Reviewers can view their own evaluations"
  ON public.interview_evaluations
  FOR SELECT
  USING (reviewer_id IN (
    SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Reviewers can create evaluations for assigned bookings"
  ON public.interview_evaluations
  FOR INSERT
  WITH CHECK (
    reviewer_id IN (
      SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM booking_reviewers br
      WHERE br.booking_id = interview_evaluations.booking_id
      AND br.reviewer_id = interview_evaluations.reviewer_id
    )
  );

CREATE POLICY "Reviewers can update their own evaluations"
  ON public.interview_evaluations
  FOR UPDATE
  USING (reviewer_id IN (
    SELECT id FROM panel_reviewers WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Admins can manage all evaluations"
  ON public.interview_evaluations
  FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Indexes for interview_evaluations
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_booking 
  ON public.interview_evaluations(booking_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_reviewer 
  ON public.interview_evaluations(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_outcome 
  ON public.interview_evaluations(outcome);

-- ===========================================
-- Additional Performance Indexes
-- ===========================================

-- Index for reviewer candidate list queries
CREATE INDEX IF NOT EXISTS idx_booking_reviewers_reviewer_booking 
  ON public.booking_reviewers(reviewer_id, booking_id);

-- Index for enrollment filtering by lifecycle
CREATE INDEX IF NOT EXISTS idx_enrollments_lifecycle_expertise 
  ON public.provider_industry_enrollments(lifecycle_status, expertise_level_id);

-- Index for proof points by enrollment (for aggregation)
CREATE INDEX IF NOT EXISTS idx_proof_points_enrollment_active 
  ON public.proof_points(enrollment_id, is_deleted) 
  WHERE is_deleted = false;