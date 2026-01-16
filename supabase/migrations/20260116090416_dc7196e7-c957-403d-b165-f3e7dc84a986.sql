-- Drop existing check constraint and add updated one with 'withdrawn' status
ALTER TABLE public.solution_provider_organizations
DROP CONSTRAINT IF EXISTS solution_provider_organizations_approval_status_check;

ALTER TABLE public.solution_provider_organizations
ADD CONSTRAINT solution_provider_organizations_approval_status_check
CHECK (approval_status IN ('pending', 'approved', 'declined', 'expired', 'withdrawn'));