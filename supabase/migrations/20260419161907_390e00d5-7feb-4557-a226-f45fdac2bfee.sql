-- Sprint 5: Creator Approval Enhancement

-- A1: New table challenge_edit_history
CREATE TABLE IF NOT EXISTS public.challenge_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'CR' CHECK (role IN ('CR', 'CU', 'LC', 'FC')),
  before_value JSONB,
  after_value JSONB,
  edit_source TEXT NOT NULL DEFAULT 'creator_edit'
    CHECK (edit_source IN ('creator_edit', 'curator_edit', 'ai_accept', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edit_history_challenge ON public.challenge_edit_history(challenge_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_section ON public.challenge_edit_history(challenge_id, section_key);

ALTER TABLE public.challenge_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view edit history for their challenges" ON public.challenge_edit_history;
CREATE POLICY "Users can view edit history for their challenges"
  ON public.challenge_edit_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles
      WHERE user_id = auth.uid()
        AND challenge_id = challenge_edit_history.challenge_id
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can insert edit history for their challenges" ON public.challenge_edit_history;
CREATE POLICY "Users can insert edit history for their challenges"
  ON public.challenge_edit_history FOR INSERT WITH CHECK (
    edited_by = auth.uid()
  );

-- A2: New columns on challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS creator_approval_status TEXT DEFAULT 'not_required'
    CHECK (creator_approval_status IN ('not_required', 'pending', 'approved', 'changes_submitted', 'changes_requested', 'timeout_override')),
  ADD COLUMN IF NOT EXISTS creator_approval_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creator_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS creator_approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS pass3_stale BOOLEAN DEFAULT false;