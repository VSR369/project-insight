-- Fix search_path for the new trigger function
CREATE OR REPLACE FUNCTION public.update_interview_quorum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;