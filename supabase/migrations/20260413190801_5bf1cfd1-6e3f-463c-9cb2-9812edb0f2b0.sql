
-- Trigger function: queue a background job to recompute profile strength
CREATE OR REPLACE FUNCTION public.fn_notify_profile_strength_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
BEGIN
  -- Determine provider_id based on the source table
  IF TG_TABLE_NAME = 'solution_providers' THEN
    v_provider_id := COALESCE(NEW.id, OLD.id);
  ELSE
    v_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);
  END IF;

  -- Insert a background job (idempotent: skip if one is already pending for this provider)
  INSERT INTO public.background_jobs (job_type, payload, status, priority, scheduled_at)
  SELECT 'recompute_profile_strength',
         jsonb_build_object('provider_id', v_provider_id),
         'pending',
         5,
         now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.background_jobs
    WHERE job_type = 'recompute_profile_strength'
      AND payload->>'provider_id' = v_provider_id::text
      AND status IN ('pending', 'processing')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger 1: solution_providers profile field changes
DROP TRIGGER IF EXISTS trg_profile_strength_on_provider_update ON public.solution_providers;
CREATE TRIGGER trg_profile_strength_on_provider_update
  AFTER UPDATE OF first_name, last_name, bio_tagline, phone, linkedin_url, portfolio_url, avatar_url, availability, expertise_level_id
  ON public.solution_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_profile_strength_update();

-- Trigger 2: provider_specialities changes
DROP TRIGGER IF EXISTS trg_profile_strength_on_specialities_change ON public.provider_specialities;
CREATE TRIGGER trg_profile_strength_on_specialities_change
  AFTER INSERT OR DELETE
  ON public.provider_specialities
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_profile_strength_update();

-- Trigger 3: provider_solution_types changes
DROP TRIGGER IF EXISTS trg_profile_strength_on_solution_types_change ON public.provider_solution_types;
CREATE TRIGGER trg_profile_strength_on_solution_types_change
  AFTER INSERT OR DELETE
  ON public.provider_solution_types
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_profile_strength_update();
