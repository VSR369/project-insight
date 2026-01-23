-- Create function to sync solution_providers.lifecycle_rank with max enrollment rank
CREATE OR REPLACE FUNCTION public.sync_provider_lifecycle_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id UUID;
  v_max_rank INTEGER;
  v_max_status TEXT;
BEGIN
  -- Determine the provider_id based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_provider_id := OLD.provider_id;
  ELSE
    v_provider_id := NEW.provider_id;
  END IF;

  -- Calculate max lifecycle_rank across all active enrollments for this provider
  SELECT 
    COALESCE(MAX(lifecycle_rank), 20) AS max_rank,
    (SELECT lifecycle_status FROM provider_industry_enrollments 
     WHERE provider_id = v_provider_id 
     ORDER BY lifecycle_rank DESC LIMIT 1) AS max_status
  INTO v_max_rank, v_max_status
  FROM provider_industry_enrollments
  WHERE provider_id = v_provider_id;

  -- Update the solution_providers table with the max values
  UPDATE solution_providers
  SET 
    lifecycle_rank = v_max_rank,
    lifecycle_status = COALESCE(v_max_status, 'registered'),
    updated_at = NOW()
  WHERE id = v_provider_id;

  -- Return appropriate row based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on provider_industry_enrollments
DROP TRIGGER IF EXISTS trg_sync_provider_lifecycle_rank ON provider_industry_enrollments;

CREATE TRIGGER trg_sync_provider_lifecycle_rank
AFTER INSERT OR UPDATE OF lifecycle_rank, lifecycle_status OR DELETE
ON provider_industry_enrollments
FOR EACH ROW
EXECUTE FUNCTION sync_provider_lifecycle_rank();

-- Add comment explaining the trigger purpose
COMMENT ON FUNCTION public.sync_provider_lifecycle_rank() IS 
'Synchronizes solution_providers.lifecycle_rank with the maximum lifecycle_rank across all enrollments for backward compatibility with legacy code paths. The provider-level rank represents the "furthest progressed" enrollment.';