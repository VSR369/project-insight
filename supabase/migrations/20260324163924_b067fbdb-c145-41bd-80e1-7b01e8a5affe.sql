
-- Section-level approval and modification tracking for curator workflow
CREATE TABLE public.curator_section_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('approval', 'modification_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'responded', 'resolved')),
  addressed_to TEXT, -- role code: LC, FC, etc.
  comment_html TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  responded_at TIMESTAMPTZ,
  response_html TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_curator_section_actions_challenge ON public.curator_section_actions(challenge_id, section_key);
CREATE INDEX idx_curator_section_actions_status ON public.curator_section_actions(status) WHERE status IN ('pending', 'sent');

ALTER TABLE public.curator_section_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view section actions"
  ON public.curator_section_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert section actions"
  ON public.curator_section_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update section actions"
  ON public.curator_section_actions FOR UPDATE
  TO authenticated
  USING (true);
