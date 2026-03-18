-- ============================================================
-- LC Review Workflow — Migration 1: Schema Additions
-- ============================================================

-- 1. Org-level LC toggle
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS lc_review_required BOOLEAN NOT NULL DEFAULT false;

-- 2. Challenge-level LC flag (inherited at creation, locked)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS lc_review_required BOOLEAN NOT NULL DEFAULT false;

-- 3. LC review columns on challenge_legal_docs
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS lc_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lc_reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS lc_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lc_review_notes TEXT;

-- 4. Validation trigger for lc_status values
CREATE OR REPLACE FUNCTION public.trg_validate_lc_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lc_status IS NOT NULL AND NEW.lc_status NOT IN (
    'pending_review', 'approved', 'rejected', 'revision_requested'
  ) THEN
    RAISE EXCEPTION 'Invalid lc_status: %. Allowed: pending_review, approved, rejected, revision_requested', NEW.lc_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenge_legal_docs_validate_lc_status ON public.challenge_legal_docs;
CREATE TRIGGER trg_challenge_legal_docs_validate_lc_status
  BEFORE INSERT OR UPDATE ON public.challenge_legal_docs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_lc_status();

-- 5. Legal review requests table
CREATE TABLE IF NOT EXISTS public.legal_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.challenge_legal_docs(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  lc_user_id UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Validation trigger for status values
CREATE OR REPLACE FUNCTION public.trg_validate_legal_review_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid legal_review_requests status: %. Allowed: pending, completed, cancelled', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_review_requests_validate_status ON public.legal_review_requests;
CREATE TRIGGER trg_legal_review_requests_validate_status
  BEFORE INSERT OR UPDATE ON public.legal_review_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_legal_review_request_status();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_review_requests_challenge ON public.legal_review_requests(challenge_id);
CREATE INDEX IF NOT EXISTS idx_legal_review_requests_status ON public.legal_review_requests(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_review_requests_lc_user ON public.legal_review_requests(lc_user_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_review_requests_document ON public.legal_review_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_challenge_legal_docs_lc_status ON public.challenge_legal_docs(challenge_id, lc_status);

-- RLS on legal_review_requests
ALTER TABLE public.legal_review_requests ENABLE ROW LEVEL SECURITY;

-- Policy: users with active challenge roles can read
CREATE POLICY "challenge_participants_read" ON public.legal_review_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = legal_review_requests.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.is_active = true
    )
  );

-- Policy: CR can insert review requests
CREATE POLICY "requester_insert" ON public.legal_review_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = legal_review_requests.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.is_active = true
    )
  );

-- Policy: LC can update review requests assigned to them
CREATE POLICY "lc_update" ON public.legal_review_requests
  FOR UPDATE
  USING (
    lc_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = legal_review_requests.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.role_code = 'LC'
        AND ucr.is_active = true
    )
  )
  WITH CHECK (
    lc_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = legal_review_requests.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.role_code = 'LC'
        AND ucr.is_active = true
    )
  );
