-- Add phase1_bypass column to seeker_organizations
ALTER TABLE public.seeker_organizations 
ADD COLUMN IF NOT EXISTS phase1_bypass BOOLEAN NOT NULL DEFAULT FALSE;