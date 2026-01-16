-- Add columns for withdrawal tracking to solution_provider_organizations
ALTER TABLE public.solution_provider_organizations 
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
ADD COLUMN IF NOT EXISTS previous_manager_email VARCHAR(255);

-- Create index for approval status queries
CREATE INDEX IF NOT EXISTS idx_spo_approval_status ON public.solution_provider_organizations (approval_status);