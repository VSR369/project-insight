-- ============================================
-- Part 1: Enhanced challenge_attachments columns
-- ============================================

ALTER TABLE public.challenge_attachments
  ADD COLUMN IF NOT EXISTS discovery_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (discovery_source IN ('manual', 'ai_suggested', 'creator_uploaded')),
  ADD COLUMN IF NOT EXISTS discovery_status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (discovery_status IN ('suggested', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS relevance_explanation TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS suggested_sections TEXT[],
  ADD COLUMN IF NOT EXISTS extracted_summary TEXT,
  ADD COLUMN IF NOT EXISTS extracted_key_data JSONB;

-- Backfill existing rows
UPDATE public.challenge_attachments
SET discovery_source = 'manual', discovery_status = 'accepted'
WHERE discovery_source IS NULL OR discovery_status IS NULL;

-- Index for filtering by discovery status
CREATE INDEX IF NOT EXISTS idx_ca_challenge_discovery
  ON public.challenge_attachments(challenge_id, discovery_status);

-- ============================================
-- Part 2: Context digest table
-- ============================================

CREATE TABLE IF NOT EXISTS public.challenge_context_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  digest_text TEXT NOT NULL,
  key_facts JSONB,
  source_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id)
);

ALTER TABLE public.challenge_context_digest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_context_digest"
  ON public.challenge_context_digest
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "svc_manage_context_digest"
  ON public.challenge_context_digest
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);