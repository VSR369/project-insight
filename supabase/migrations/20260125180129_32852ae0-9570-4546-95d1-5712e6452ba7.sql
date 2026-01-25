-- =====================================================
-- Multi-Tier Reviewer Selection Algorithm
-- Implements load-balanced selection based on pool size
-- =====================================================

-- 1. Helper: Count reviewer's interviews in lookback period
CREATE OR REPLACE FUNCTION get_reviewer_interview_count(
  p_reviewer_id UUID, 
  p_days_lookback INTEGER DEFAULT 30
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM booking_reviewers br
  JOIN interview_bookings ib ON ib.id = br.booking_id
  WHERE br.reviewer_id = p_reviewer_id
    AND br.status = 'assigned'
    AND ib.status IN ('scheduled', 'confirmed', 'completed')
    AND ib.scheduled_at >= NOW() - (p_days_lookback || ' days')::INTERVAL;
$$;

-- 2. Helper: Days since reviewer's last interview
CREATE OR REPLACE FUNCTION get_reviewer_days_idle(
  p_reviewer_id UUID
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXTRACT(DAY FROM NOW() - MAX(ib.scheduled_at))::INTEGER,
    999  -- Never had an interview = very idle
  )
  FROM booking_reviewers br
  JOIN interview_bookings ib ON ib.id = br.booking_id
  WHERE br.reviewer_id = p_reviewer_id
    AND ib.status IN ('scheduled', 'confirmed', 'completed');
$$;

-- 3. Helper: Count active reviewers for expertise/industry combo
CREATE OR REPLACE FUNCTION get_active_reviewer_count(
  p_expertise_level_id UUID,
  p_industry_segment_id UUID
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM panel_reviewers pr
  WHERE pr.is_active = true
    AND pr.approval_status = 'approved'
    AND p_expertise_level_id = ANY(pr.expertise_level_ids)
    AND p_industry_segment_id = ANY(pr.industry_segment_ids);
$$;

-- 4. Multi-tier weighted selection function
CREATE OR REPLACE FUNCTION select_reviewers_weighted(
  p_slot_ids UUID[],
  p_quorum_required INTEGER,
  p_expertise_level_id UUID,
  p_industry_segment_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
) RETURNS UUID[]
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_size INTEGER;
  v_selected UUID[] := '{}';
  v_slot RECORD;
BEGIN
  -- Get pool size to determine algorithm tier
  v_pool_size := get_active_reviewer_count(p_expertise_level_id, p_industry_segment_id);
  
  -- TIER 1: ≤15 reviewers - Simple load-balanced
  IF v_pool_size <= 15 THEN
    FOR v_slot IN
      SELECT is_tbl.id, is_tbl.reviewer_id
      FROM interview_slots is_tbl
      WHERE is_tbl.id = ANY(p_slot_ids) 
        AND is_tbl.status = 'open'
      ORDER BY get_reviewer_interview_count(is_tbl.reviewer_id) ASC, RANDOM()
      FOR UPDATE SKIP LOCKED
    LOOP
      IF NOT check_reviewer_time_conflict(v_slot.reviewer_id, p_start_at, p_end_at, NULL) THEN
        v_selected := array_append(v_selected, v_slot.id);
        IF array_length(v_selected, 1) >= p_quorum_required THEN EXIT; END IF;
      END IF;
    END LOOP;
    
  -- TIER 2: 16-50 reviewers - Weighted score (60% load + 40% recency)
  ELSIF v_pool_size <= 50 THEN
    FOR v_slot IN
      SELECT is_tbl.id, is_tbl.reviewer_id,
        (0.6 * (1.0 - LEAST(get_reviewer_interview_count(is_tbl.reviewer_id)::FLOAT / 10.0, 1.0)) +
         0.4 * (LEAST(get_reviewer_days_idle(is_tbl.reviewer_id)::FLOAT / 30.0, 1.0))) AS score
      FROM interview_slots is_tbl
      WHERE is_tbl.id = ANY(p_slot_ids) 
        AND is_tbl.status = 'open'
      ORDER BY score DESC, RANDOM()
      FOR UPDATE SKIP LOCKED
    LOOP
      IF NOT check_reviewer_time_conflict(v_slot.reviewer_id, p_start_at, p_end_at, NULL) THEN
        v_selected := array_append(v_selected, v_slot.id);
        IF array_length(v_selected, 1) >= p_quorum_required THEN EXIT; END IF;
      END IF;
    END LOOP;
    
  -- TIER 3: >50 reviewers - Bucketed selection (Low/Medium/High load)
  ELSE
    FOR v_slot IN
      SELECT is_tbl.id, is_tbl.reviewer_id,
        CASE 
          WHEN get_reviewer_interview_count(is_tbl.reviewer_id) <= 2 THEN 1  -- Low load
          WHEN get_reviewer_interview_count(is_tbl.reviewer_id) <= 5 THEN 2  -- Medium
          ELSE 3  -- High load
        END AS load_bucket
      FROM interview_slots is_tbl
      WHERE is_tbl.id = ANY(p_slot_ids) 
        AND is_tbl.status = 'open'
      ORDER BY load_bucket ASC, RANDOM()
      FOR UPDATE SKIP LOCKED
    LOOP
      IF NOT check_reviewer_time_conflict(v_slot.reviewer_id, p_start_at, p_end_at, NULL) THEN
        v_selected := array_append(v_selected, v_slot.id);
        IF array_length(v_selected, 1) >= p_quorum_required THEN EXIT; END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN v_selected;
END;
$$;

-- 5. Update book_interview_slot to use weighted selection
CREATE OR REPLACE FUNCTION public.book_interview_slot(p_provider_id uuid, p_enrollment_id uuid, p_composite_slot_id uuid, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_composite_slot RECORD;
  v_enrollment RECORD;
  v_quorum_required INTEGER;
  v_booking_id UUID;
  v_selected_slot_ids UUID[];
  v_selected_count INTEGER;
  v_existing_booking UUID;
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

  -- Step 5: Use weighted selection algorithm (replaces arbitrary selection)
  -- This automatically adapts based on reviewer pool size:
  -- ≤15: Load-balanced (fewer interviews first)
  -- 16-50: Weighted score (60% load + 40% recency)
  -- >50: Bucketed selection (Low/Medium/High load tiers)
  v_selected_slot_ids := select_reviewers_weighted(
    v_composite_slot.backing_slot_ids,
    v_quorum_required,
    v_enrollment.expertise_level_id,
    v_enrollment.industry_segment_id,
    v_composite_slot.start_at,
    v_composite_slot.end_at
  );

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
$function$;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_booking_reviewers_load_stats
ON booking_reviewers(reviewer_id, status, created_at)
WHERE status = 'assigned';

CREATE INDEX IF NOT EXISTS idx_interview_bookings_scheduled_status
ON interview_bookings(scheduled_at DESC)
WHERE status IN ('scheduled', 'confirmed', 'completed');

CREATE INDEX IF NOT EXISTS idx_panel_reviewers_active_approved
ON panel_reviewers(is_active, approval_status)
WHERE is_active = true AND approval_status = 'approved';

-- 7. Monitoring view for admin workload dashboard
CREATE OR REPLACE VIEW reviewer_workload_distribution AS
SELECT 
  pr.id,
  pr.name,
  pr.email,
  pr.expertise_level_ids,
  pr.industry_segment_ids,
  get_reviewer_interview_count(pr.id, 30) AS interviews_30d,
  get_reviewer_interview_count(pr.id, 7) AS interviews_7d,
  get_reviewer_days_idle(pr.id) AS days_since_last,
  CASE 
    WHEN get_reviewer_days_idle(pr.id) > 14 THEN 'idle_alert'
    WHEN get_reviewer_interview_count(pr.id, 30) > 8 THEN 'overloaded'
    ELSE 'balanced'
  END AS workload_status,
  CASE 
    WHEN get_reviewer_interview_count(pr.id, 30) <= 2 THEN 'low'
    WHEN get_reviewer_interview_count(pr.id, 30) <= 5 THEN 'medium'
    ELSE 'high'
  END AS load_bucket
FROM panel_reviewers pr
WHERE pr.is_active = true
  AND pr.approval_status = 'approved'
ORDER BY interviews_30d DESC;