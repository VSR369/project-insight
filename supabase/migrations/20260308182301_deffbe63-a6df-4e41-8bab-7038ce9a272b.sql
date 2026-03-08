-- Fix fn_trigger_bulk_reassign: skip http_post when vault secrets are missing
-- instead of crashing the entire availability UPDATE transaction.

CREATE OR REPLACE FUNCTION public.fn_trigger_bulk_reassign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  TEXT;
  v_key  TEXT;
BEGIN
  -- Only fire on fresh transition INTO On_Leave or Inactive (idempotent, EC-06-10)
  IF (OLD.availability_status IS DISTINCT FROM NEW.availability_status)
     AND NEW.availability_status IN ('On_Leave', 'Inactive')
     AND OLD.availability_status NOT IN ('On_Leave', 'Inactive')
  THEN
    -- Check if admin has active verifications
    IF EXISTS (
      SELECT 1 FROM platform_admin_verifications
       WHERE assigned_admin_id = NEW.id
         AND status = 'Under_Verification'
    ) THEN
      -- Safely read secrets; skip HTTP call if missing
      SELECT decrypted_secret INTO v_url
        FROM vault.decrypted_secrets WHERE name = 'supabase_url';
      SELECT decrypted_secret INTO v_key
        FROM vault.decrypted_secrets WHERE name = 'service_role_key';

      IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
        PERFORM net.http_post(
          url     := v_url || '/functions/v1/bulk-reassign',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
          ),
          body    := jsonb_build_object(
            'departing_admin_id', NEW.id,
            'trigger', CASE WHEN NEW.availability_status = 'On_Leave' THEN 'LEAVE' ELSE 'DEACTIVATION' END
          )
        );
      ELSE
        RAISE LOG 'fn_trigger_bulk_reassign: vault secrets missing, skipping bulk-reassign HTTP call for admin %', NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;