
-- Challenge Section Approvals — tracks per-section CR sign-off
CREATE TABLE IF NOT EXISTS public.challenge_section_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  reviewer_id UUID REFERENCES auth.users(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (challenge_id, section_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_section_approvals_challenge ON public.challenge_section_approvals(challenge_id);
CREATE INDEX IF NOT EXISTS idx_section_approvals_status ON public.challenge_section_approvals(challenge_id, status);

-- RLS
ALTER TABLE public.challenge_section_approvals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "authenticated_read_section_approvals"
ON public.challenge_section_approvals
FOR SELECT
TO authenticated
USING (true);

-- Creator can insert section approvals
CREATE POLICY "creator_insert_section_approvals"
ON public.challenge_section_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_section_approvals.challenge_id
      AND c.created_by = auth.uid()
  )
);

-- Creator can update section approvals (approve/request changes)
CREATE POLICY "creator_update_section_approvals"
ON public.challenge_section_approvals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_section_approvals.challenge_id
      AND c.created_by = auth.uid()
  )
);
