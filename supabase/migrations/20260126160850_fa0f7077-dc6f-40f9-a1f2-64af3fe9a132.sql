-- =====================================================
-- Update Composite Slot Generation to Use Slot-Level Metadata
-- Prioritize slot_industry_ids/slot_expertise_ids when set,
-- fall back to panel_reviewers profile when not specified.
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
  -- Uses slot-level IDs if specified, otherwise falls back to reviewer profile
  FOR v_combo IN
    SELECT DISTINCT
      s.start_at,
      s.end_at,
      el.id AS expertise_level_id,
      ind.id AS industry_segment_id
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    -- Use slot-level expertise IDs if populated, else use reviewer profile
    CROSS JOIN UNNEST(
      CASE 
        WHEN s.slot_expertise_ids IS NOT NULL AND array_length(s.slot_expertise_ids, 1) > 0 
        THEN s.slot_expertise_ids
        ELSE pr.expertise_level_ids
      END
    ) AS el(id)
    -- Use slot-level industry IDs if populated, else use reviewer profile
    CROSS JOIN UNNEST(
      CASE 
        WHEN s.slot_industry_ids IS NOT NULL AND array_length(s.slot_industry_ids, 1) > 0 
        THEN s.slot_industry_ids
        ELSE pr.industry_segment_ids
      END
    ) AS ind(id)
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
      -- Check if this slot covers the expertise level (slot-level or profile-level)
      AND (
        (s.slot_expertise_ids IS NOT NULL AND array_length(s.slot_expertise_ids, 1) > 0 AND v_combo.expertise_level_id = ANY(s.slot_expertise_ids))
        OR
        (s.slot_expertise_ids IS NULL OR array_length(s.slot_expertise_ids, 1) IS NULL OR array_length(s.slot_expertise_ids, 1) = 0) AND v_combo.expertise_level_id = ANY(pr.expertise_level_ids)
      )
      -- Check if this slot covers the industry segment (slot-level or profile-level)
      AND (
        (s.slot_industry_ids IS NOT NULL AND array_length(s.slot_industry_ids, 1) > 0 AND v_combo.industry_segment_id = ANY(s.slot_industry_ids))
        OR
        (s.slot_industry_ids IS NULL OR array_length(s.slot_industry_ids, 1) IS NULL OR array_length(s.slot_industry_ids, 1) = 0) AND v_combo.industry_segment_id = ANY(pr.industry_segment_ids)
      )
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

-- Also update the refresh_all_composite_slots function to use slot-level metadata
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
  -- Uses slot-level IDs if specified, otherwise falls back to reviewer profile
  FOR v_combo IN
    SELECT DISTINCT
      s.start_at,
      s.end_at,
      el.id AS expertise_level_id,
      ind.id AS industry_segment_id
    FROM interview_slots s
    JOIN panel_reviewers pr ON pr.id = s.reviewer_id
    CROSS JOIN UNNEST(
      CASE 
        WHEN s.slot_expertise_ids IS NOT NULL AND array_length(s.slot_expertise_ids, 1) > 0 
        THEN s.slot_expertise_ids
        ELSE pr.expertise_level_ids
      END
    ) AS el(id)
    CROSS JOIN UNNEST(
      CASE 
        WHEN s.slot_industry_ids IS NOT NULL AND array_length(s.slot_industry_ids, 1) > 0 
        THEN s.slot_industry_ids
        ELSE pr.industry_segment_ids
      END
    ) AS ind(id)
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
      AND (
        (s.slot_expertise_ids IS NOT NULL AND array_length(s.slot_expertise_ids, 1) > 0 AND v_combo.expertise_level_id = ANY(s.slot_expertise_ids))
        OR
        (s.slot_expertise_ids IS NULL OR array_length(s.slot_expertise_ids, 1) IS NULL OR array_length(s.slot_expertise_ids, 1) = 0) AND v_combo.expertise_level_id = ANY(pr.expertise_level_ids)
      )
      AND (
        (s.slot_industry_ids IS NOT NULL AND array_length(s.slot_industry_ids, 1) > 0 AND v_combo.industry_segment_id = ANY(s.slot_industry_ids))
        OR
        (s.slot_industry_ids IS NULL OR array_length(s.slot_industry_ids, 1) IS NULL OR array_length(s.slot_industry_ids, 1) = 0) AND v_combo.industry_segment_id = ANY(pr.industry_segment_ids)
      )
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