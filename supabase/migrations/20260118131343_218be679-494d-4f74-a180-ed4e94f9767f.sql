-- Add enrollment tracking columns to panel_reviewers for self-signup support
ALTER TABLE public.panel_reviewers
  ADD COLUMN IF NOT EXISTS enrollment_source VARCHAR(20) 
    DEFAULT 'invitation' CHECK (enrollment_source IN ('invitation', 'self_signup')),
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) 
    DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS why_join_statement TEXT;

-- Update existing reviewers to have approved status (they were all invited)
UPDATE public.panel_reviewers 
SET enrollment_source = 'invitation', 
    approval_status = 'approved' 
WHERE enrollment_source IS NULL OR approval_status IS NULL;

-- Add index for filtering pending approvals
CREATE INDEX IF NOT EXISTS idx_panel_reviewers_approval_status 
  ON public.panel_reviewers(approval_status) 
  WHERE approval_status = 'pending';

-- Create admin_access_codes table for restricted admin self-signup
CREATE TABLE IF NOT EXISTS public.admin_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL,
  description TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on admin_access_codes
ALTER TABLE public.admin_access_codes ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage access codes
CREATE POLICY "Admins can manage access codes"
  ON public.admin_access_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'platform_admin'
    )
  );