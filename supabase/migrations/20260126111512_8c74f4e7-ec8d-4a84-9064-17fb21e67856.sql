-- =====================================================
-- Phase 1: Create Composite Slot Generation Functions
-- Automatically sync interview_slots → composite_interview_slots
-- =====================================================

-- Function to refresh composite slots for a specific time window
CREATE OR REPLACE FUNCTION public.refresh_composite_slots_for_time(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_combo RECORD;
  v_slot_ids UUID[];
  v_existing_id UUID;
BEGIN
  -- For each unique combination of time + expertise + industry from open slots
  FOR v_combo IN
    SELECT DISTINCT
      s.start_at,
      s.end_at,
      el.id AS expertise_level_id,
      ind.id AS industry_segment_id
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    CROSS JOIN UNNEST(pr.expertise_level_ids) AS el(id)
    CROSS JOIN UNNEST(pr.industry_segment_ids) AS ind(id)
    WHERE s.status = 'open'
      AND s.start_at >= p_start_at
      AND s.end_at <= p_end_at
      AND pr.is_active = true
      AND pr.approval_status = 'approved'
  LOOP
    -- Get all slot IDs for this combination
    SELECT ARRAY_AGG(DISTINCT s.id)
    INTO v_slot_ids
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    WHERE s.status = 'open'
      AND s.start_at = v_combo.start_at
      AND s.end_at = v_combo.end_at
      AND v_combo.expertise_level_id = ANY(pr.expertise_level_ids)
      AND v_combo.industry_segment_id = ANY(pr.industry_segment_ids)
      AND pr.is_active = true
      AND pr.approval_status = 'approved';

    -- Check if composite slot exists
    SELECT id INTO v_existing_id
    FROM composite_interview_slots
    WHERE start_at = v_combo.start_at
      AND end_at = v_combo.end_at
      AND expertise_level_id = v_combo.expertise_level_id
      AND industry_segment_id = v_combo.industry_segment_id;

    IF v_existing_id IS NOT NULL THEN
      -- Update existing composite slot
      UPDATE composite_interview_slots
      SET backing_slot_ids = v_slot_ids,
          available_reviewer_count = COALESCE(array_length(v_slot_ids, 1), 0),
          status = CASE 
            WHEN COALESCE(array_length(v_slot_ids, 1), 0) > 0 THEN 'open'
            ELSE 'cancelled'
          END,
          updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      -- Create new composite slot (only if we have slots)
      IF v_slot_ids IS NOT NULL AND array_length(v_slot_ids, 1) > 0 THEN
        INSERT INTO composite_interview_slots (
          start_at,
          end_at,
          expertise_level_id,
          industry_segment_id,
          backing_slot_ids,
          available_reviewer_count,
          status
        ) VALUES (
          v_combo.start_at,
          v_combo.end_at,
          v_combo.expertise_level_id,
          v_combo.industry_segment_id,
          v_slot_ids,
          array_length(v_slot_ids, 1),
          'open'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to refresh ALL composite slots (for initial population)
CREATE OR REPLACE FUNCTION public.refresh_all_composite_slots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_combo RECORD;
  v_slot_ids UUID[];
BEGIN
  -- Clear existing composite slots that may be stale
  DELETE FROM composite_interview_slots WHERE status = 'open';

  -- Generate composite slots for all open interview_slots
  FOR v_combo IN
    SELECT DISTINCT
      s.start_at,
      s.end_at,
      el.id AS expertise_level_id,
      ind.id AS industry_segment_id
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    CROSS JOIN UNNEST(pr.expertise_level_ids) AS el(id)
    CROSS JOIN UNNEST(pr.industry_segment_ids) AS ind(id)
    WHERE s.status = 'open'
      AND s.start_at > now()
      AND pr.is_active = true
      AND pr.approval_status = 'approved'
  LOOP
    -- Get all slot IDs for this combination
    SELECT ARRAY_AGG(DISTINCT s.id)
    INTO v_slot_ids
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    WHERE s.status = 'open'
      AND s.start_at = v_combo.start_at
      AND s.end_at = v_combo.end_at
      AND v_combo.expertise_level_id = ANY(pr.expertise_level_ids)
      AND v_combo.industry_segment_id = ANY(pr.industry_segment_ids)
      AND pr.is_active = true
      AND pr.approval_status = 'approved';

    -- Create composite slot
    IF v_slot_ids IS NOT NULL AND array_length(v_slot_ids, 1) > 0 THEN
      INSERT INTO composite_interview_slots (
        start_at,
        end_at,
        expertise_level_id,
        industry_segment_id,
        backing_slot_ids,
        available_reviewer_count,
        status
      ) VALUES (
        v_combo.start_at,
        v_combo.end_at,
        v_combo.expertise_level_id,
        v_combo.industry_segment_id,
        v_slot_ids,
        array_length(v_slot_ids, 1),
        'open'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =====================================================
-- Phase 2: Create Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_interview_slot_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_record RECORD;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
BEGIN
  -- Determine the affected time range
  IF TG_OP = 'DELETE' THEN
    v_start_at := OLD.start_at;
    v_end_at := OLD.end_at;
  ELSE
    v_start_at := NEW.start_at;
    v_end_at := NEW.end_at;
  END IF;

  -- Refresh composite slots for the affected time window
  PERFORM refresh_composite_slots_for_time(v_start_at, v_end_at);

  -- For UPDATE operations that change time, also refresh the old time
  IF TG_OP = 'UPDATE' AND (OLD.start_at != NEW.start_at OR OLD.end_at != NEW.end_at) THEN
    PERFORM refresh_composite_slots_for_time(OLD.start_at, OLD.end_at);
  END IF;

  -- Clean up empty composite slots
  DELETE FROM composite_interview_slots
  WHERE backing_slot_ids = '{}'
     OR available_reviewer_count = 0;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- Phase 3: Create Trigger on interview_slots
-- =====================================================

DROP TRIGGER IF EXISTS trg_refresh_composite_slots ON interview_slots;

CREATE TRIGGER trg_refresh_composite_slots
  AFTER INSERT OR UPDATE OR DELETE ON interview_slots
  FOR EACH ROW
  EXECUTE FUNCTION handle_interview_slot_change();

-- =====================================================
-- Phase 4: Initial Population
-- Populate composite_interview_slots from existing data
-- =====================================================

SELECT refresh_all_composite_slots();