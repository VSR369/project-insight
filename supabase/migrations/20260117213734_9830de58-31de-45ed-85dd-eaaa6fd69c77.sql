-- Add cancellation tracking fields to panel_reviewers
ALTER TABLE public.panel_reviewers
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- Create index for cancelled status queries
CREATE INDEX IF NOT EXISTS idx_panel_reviewers_cancelled 
  ON public.panel_reviewers(cancelled_at) 
  WHERE cancelled_at IS NOT NULL;