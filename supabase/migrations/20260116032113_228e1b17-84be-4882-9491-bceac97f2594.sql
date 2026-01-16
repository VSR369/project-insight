-- Add missing audit fields to provider_proficiency_areas
ALTER TABLE public.provider_proficiency_areas
  ADD COLUMN updated_at TIMESTAMPTZ,
  ADD COLUMN created_by UUID,
  ADD COLUMN updated_by UUID;

-- Add foreign key constraints for audit fields
ALTER TABLE public.provider_proficiency_areas
  ADD CONSTRAINT provider_proficiency_areas_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id),
  ADD CONSTRAINT provider_proficiency_areas_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_provider_proficiency_areas_updated_at
  BEFORE UPDATE ON public.provider_proficiency_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for audit columns
CREATE INDEX idx_provider_proficiency_areas_created_by 
  ON public.provider_proficiency_areas(created_by);