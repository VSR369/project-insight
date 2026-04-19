-- A1: Challenge status history (immutable audit log)
CREATE TABLE IF NOT EXISTS public.challenge_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_phase INTEGER,
  to_phase INTEGER,
  changed_by UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('CR', 'CU', 'LC', 'FC', 'SYSTEM', 'ADMIN')),
  trigger_event TEXT NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_challenge
  ON public.challenge_status_history(challenge_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created
  ON public.challenge_status_history(challenge_id, created_at DESC);

ALTER TABLE public.challenge_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view status history for their challenges"
  ON public.challenge_status_history;
CREATE POLICY "Users can view status history for their challenges"
  ON public.challenge_status_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles
      WHERE user_id = auth.uid()
        AND challenge_id = challenge_status_history.challenge_id
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert status history"
  ON public.challenge_status_history;
CREATE POLICY "Authenticated users can insert status history"
  ON public.challenge_status_history FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

COMMENT ON TABLE public.challenge_status_history IS
  'Immutable audit log of every challenge status transition. Rows are insert-only — never updated or deleted.';

-- A2: New columns on escrow_records
ALTER TABLE public.escrow_records
  ADD COLUMN IF NOT EXISTS account_number_masked TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_swift_code TEXT,
  ADD COLUMN IF NOT EXISTS proof_document_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_file_name TEXT,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ;

-- A3: Storage bucket for escrow proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'escrow-proofs',
  'escrow-proofs',
  false,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "FC can upload escrow proofs" ON storage.objects;
CREATE POLICY "FC can upload escrow proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'escrow-proofs'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authorized users can view escrow proofs" ON storage.objects;
CREATE POLICY "Authorized users can view escrow proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'escrow-proofs'
    AND auth.uid() IS NOT NULL
  );

-- A4: Org-level LC review timeout override
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS lc_review_timeout_days_override INTEGER;

COMMENT ON COLUMN public.seeker_organizations.lc_review_timeout_days_override IS
  'Org-level override for LC review timeout. If NULL, falls back to md_governance_mode_config.lc_review_timeout_days (default 7).';
