
-- duplicate_reviews: Human review workflow for duplicate challenge detection
CREATE TABLE public.duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  matched_challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  similarity_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED_DUPLICATE', 'DISMISSED')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_duplicate_reviews_challenge ON public.duplicate_reviews(challenge_id, status);
CREATE INDEX idx_duplicate_reviews_matched ON public.duplicate_reviews(matched_challenge_id);
CREATE INDEX idx_duplicate_reviews_status ON public.duplicate_reviews(status) WHERE status = 'PENDING';

-- RLS
ALTER TABLE public.duplicate_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view duplicate reviews"
  ON public.duplicate_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create duplicate reviews"
  ON public.duplicate_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update duplicate reviews"
  ON public.duplicate_reviews
  FOR UPDATE
  TO authenticated
  USING (true);
