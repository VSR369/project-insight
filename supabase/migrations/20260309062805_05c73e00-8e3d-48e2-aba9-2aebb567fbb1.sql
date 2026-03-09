
-- tc_acceptances table for tracking T&C acceptance on activation
CREATE TABLE IF NOT EXISTS public.tc_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_terms_id UUID NOT NULL REFERENCES public.platform_terms(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  acceptance_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_acceptances_user ON public.tc_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_tc_acceptances_terms ON public.tc_acceptances(platform_terms_id);

ALTER TABLE public.tc_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own acceptances"
  ON public.tc_acceptances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert acceptances"
  ON public.tc_acceptances FOR INSERT
  WITH CHECK (true);
