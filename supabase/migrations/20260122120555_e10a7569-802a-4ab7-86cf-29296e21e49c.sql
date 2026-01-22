-- =====================================================
-- Fix: Update book_interview_slot with conflict-aware logic
-- Removes unused variable that caused the error
-- =====================================================

-- Replace the book_interview_slot function with conflict-aware version
CREATE OR REPLACE FUNCTION public.book_interview_slot(
  p_provider_id UUID,
  p_enrollment_id UUID,
  p_composite_slot_id UUID,
  p_user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_composite_slot RECORD;
  v_enrollment RECORD;
  v_quorum_required INTEGER;
  v_booking_id UUID;
  v_selected_slot_ids UUID[];
  v_selected_count INTEGER;
  v_existing_booking UUID;
  v_slot RECORD;
BEGIN
  -- Step 0: Check for existing active booking for this enrollment
  SELECT id INTO v_existing_booking
  FROM interview_bookings
  WHERE enrollment_id = p_enrollment_id
    AND status IN ('scheduled', 'confirmed')
  LIMIT 1;

  IF v_existing_booking IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have an active booking for this enrollment');
  END IF;

  -- Step 1: Get enrollment details
  SELECT * INTO v_enrollment
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id
    AND provider_id = p_provider_id;

  IF v_enrollment IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid enrollment');
  END IF;

  -- Verify provider has passed assessment
  IF v_enrollment.lifecycle_rank < 110 THEN
    RETURN json_build_object('success', false, 'error', 'Assessment must be passed before scheduling interview');
  END IF;

  -- Step 2: Lock composite slot for update
  SELECT *
  INTO v_composite_slot
  FROM composite_interview_slots
  WHERE id = p_composite_slot_id
    AND status = 'open'
    AND expertise_level_id = v_enrollment.expertise_level_id
    AND industry_segment_id = v_enrollment.industry_segment_id
  FOR UPDATE;

  IF v_composite_slot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Slot no longer available or not valid for your enrollment');
  END IF;

  -- Step 3: Check for enrollment time conflict (provider already booked at this time)
  IF check_enrollment_time_conflict(
    p_enrollment_id,
    v_composite_slot.start_at,
    v_composite_slot.end_at,
    NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have an interview scheduled at this time');
  END IF;

  -- Step 4: Get quorum requirement
  SELECT required_quorum_count INTO v_quorum_required
  FROM interview_quorum_requirements
  WHERE expertise_level_id = v_enrollment.expertise_level_id
    AND (industry_segment_id IS NULL OR industry_segment_id = v_enrollment.industry_segment_id)
    AND is_active = true
  ORDER BY industry_segment_id NULLS LAST
  LIMIT 1;

  v_quorum_required := COALESCE(v_quorum_required, 2);

  -- Step 5: Get CONFLICT-FREE reviewer slots only
  -- Lock individual slots and filter out reviewers with conflicts
  v_selected_slot_ids := ARRAY[]::UUID[];
  
  FOR v_slot IN
    SELECT is_tbl.id, is_tbl.reviewer_id
    FROM interview_slots is_tbl
    WHERE is_tbl.id = ANY(v_composite_slot.backing_slot_ids)
      AND is_tbl.status = 'open'
    FOR UPDATE
  LOOP
    -- Check if this reviewer has a time conflict
    IF NOT check_reviewer_time_conflict(
      v_slot.reviewer_id,
      v_composite_slot.start_at,
      v_composite_slot.end_at,
      NULL
    ) THEN
      v_selected_slot_ids := array_append(v_selected_slot_ids, v_slot.id);
      
      -- Stop once we have enough reviewers
      IF array_length(v_selected_slot_ids, 1) >= v_quorum_required THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;

  v_selected_count := COALESCE(array_length(v_selected_slot_ids, 1), 0);

  IF v_selected_count < v_quorum_required THEN
    RETURN json_build_object('success', false, 'error', 
      format('Only %s of %s required reviewers are available at this time (others have conflicts). Please select another slot.', 
        v_selected_count, v_quorum_required));
  END IF;

  -- Step 6: Create booking
  INSERT INTO interview_bookings (
    provider_id, enrollment_id, composite_slot_id, 
    scheduled_at, status, created_by
  ) VALUES (
    p_provider_id, p_enrollment_id, p_composite_slot_id,
    v_composite_slot.start_at, 'scheduled', p_user_id
  ) RETURNING id INTO v_booking_id;

  -- Step 7: Update selected individual slots to 'booked'
  UPDATE interview_slots
  SET status = 'booked', updated_at = NOW()
  WHERE id = ANY(v_selected_slot_ids);

  -- Step 8: Link reviewers to booking
  INSERT INTO booking_reviewers (booking_id, reviewer_id, slot_id)
  SELECT v_booking_id, reviewer_id, id
  FROM interview_slots
  WHERE id = ANY(v_selected_slot_ids);

  -- Step 9: Update composite slot status
  UPDATE composite_interview_slots
  SET status = 'booked', updated_at = NOW()
  WHERE id = p_composite_slot_id;

  -- Step 10: Update enrollment lifecycle
  UPDATE provider_industry_enrollments
  SET lifecycle_status = 'panel_scheduled',
      lifecycle_rank = 120,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_enrollment_id;

  RETURN json_build_object(
    'success', true, 
    'booking_id', v_booking_id,
    'scheduled_at', v_composite_slot.start_at,
    'reviewer_count', v_selected_count
  );
END;
$$;