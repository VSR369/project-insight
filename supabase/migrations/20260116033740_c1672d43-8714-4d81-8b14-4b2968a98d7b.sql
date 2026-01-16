-- Add lifecycle_rank column to solution_providers for numeric comparison
ALTER TABLE public.solution_providers
  ADD COLUMN lifecycle_rank INTEGER NOT NULL DEFAULT 10;

-- Add comment for documentation
COMMENT ON COLUMN public.solution_providers.lifecycle_rank IS 
  'Numeric rank: 10=invited, 15=registered, 20=enrolled, 30=profile_building, 40=assessment_pending, 50=assessment_completed, 60=verified, 70=active, 80=suspended, 90=inactive';

-- Update existing records based on current lifecycle_status
UPDATE public.solution_providers SET lifecycle_rank = CASE
  WHEN lifecycle_status = 'invited' THEN 10
  WHEN lifecycle_status = 'registered' THEN 15
  WHEN lifecycle_status = 'profile_building' THEN 30
  WHEN lifecycle_status = 'assessment_pending' THEN 40
  WHEN lifecycle_status = 'assessment_completed' THEN 50
  WHEN lifecycle_status = 'verified' THEN 60
  WHEN lifecycle_status = 'active' THEN 70
  WHEN lifecycle_status = 'suspended' THEN 80
  WHEN lifecycle_status = 'inactive' THEN 90
  ELSE 10
END;

-- Add 'enrolled' status to lifecycle_status enum
ALTER TYPE public.lifecycle_status ADD VALUE IF NOT EXISTS 'enrolled' AFTER 'registered';

-- Add index for lifecycle_rank for performance
CREATE INDEX idx_solution_providers_lifecycle_rank ON public.solution_providers(lifecycle_rank);