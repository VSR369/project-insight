
CREATE OR REPLACE FUNCTION fn_sync_admin_workload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_admin_id := OLD.assigned_admin_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.assigned_admin_id IS DISTINCT FROM NEW.assigned_admin_id THEN
      IF OLD.assigned_admin_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM verification_assignments
        WHERE assigned_admin_id = OLD.assigned_admin_id AND is_current = true;

        SELECT max_concurrent_verifications INTO v_max
        FROM platform_admin_profiles WHERE id = OLD.assigned_admin_id;

        UPDATE platform_admin_profiles
        SET current_active_verifications = v_count,
            availability_status = CASE
              WHEN v_count = 0 THEN 'Available'
              WHEN v_count >= COALESCE(v_max, 5) THEN 'Fully_Loaded'
              ELSE 'Partially_Available'
            END,
            updated_at = now()
        WHERE id = OLD.assigned_admin_id;
      END IF;
    END IF;
    v_admin_id := NEW.assigned_admin_id;
  ELSE
    v_admin_id := NEW.assigned_admin_id;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM verification_assignments
    WHERE assigned_admin_id = v_admin_id AND is_current = true;

    SELECT max_concurrent_verifications INTO v_max
    FROM platform_admin_profiles WHERE id = v_admin_id;

    UPDATE platform_admin_profiles
    SET current_active_verifications = v_count,
        availability_status = CASE
          WHEN v_count = 0 THEN 'Available'
          WHEN v_count >= COALESCE(v_max, 5) THEN 'Fully_Loaded'
          ELSE 'Partially_Available'
        END,
        updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
