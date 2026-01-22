-- Add review columns to proof_points table for reviewer assessments
ALTER TABLE public.proof_points
  ADD COLUMN IF NOT EXISTS review_relevance_rating VARCHAR(10),
  ADD COLUMN IF NOT EXISTS review_score_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS review_comments VARCHAR(500),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add constraint for relevance rating values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_relevance_rating'
  ) THEN
    ALTER TABLE public.proof_points
      ADD CONSTRAINT chk_review_relevance_rating 
      CHECK (review_relevance_rating IS NULL OR review_relevance_rating IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- Add constraint for score rating range (0-10)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_score_rating'
  ) THEN
    ALTER TABLE public.proof_points
      ADD CONSTRAINT chk_review_score_rating 
      CHECK (review_score_rating IS NULL OR (review_score_rating >= 0 AND review_score_rating <= 10));
  END IF;
END $$;

-- Add proof points review status columns to enrollments
ALTER TABLE public.provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS proof_points_review_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS proof_points_reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS proof_points_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_points_final_score DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS proof_points_reviewer_notes TEXT;

-- Add constraint for proof points review status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_proof_points_review_status'
  ) THEN
    ALTER TABLE public.provider_industry_enrollments
      ADD CONSTRAINT chk_proof_points_review_status 
      CHECK (proof_points_review_status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_proof_points_reviewed_at 
  ON public.proof_points(reviewed_at) WHERE reviewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proof_points_enrollment_review 
  ON public.proof_points(enrollment_id, review_relevance_rating, review_score_rating);

CREATE INDEX IF NOT EXISTS idx_enrollments_proof_points_review 
  ON public.provider_industry_enrollments(proof_points_review_status) 
  WHERE proof_points_review_status IS NOT NULL;