-- =====================================================
-- Phase 1: Clean up existing conflicting bookings
-- Cancel duplicate bookings where same reviewer is assigned at same time
-- =====================================================

-- First, identify and cancel conflicting bookings (keep earliest per reviewer+time)
WITH ranked_conflicts AS (
  SELECT 
    br.booking_id,
    br.reviewer_id,
    ist.start_at,
    ib.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY br.reviewer_id, ist.start_at 
      ORDER BY ib.created_at ASC
    ) as rn
  FROM booking_reviewers br
  JOIN interview_slots ist ON ist.id = br.slot_id
  JOIN interview_bookings ib ON ib.id = br.booking_id
  WHERE br.status = 'assigned'
    AND ib.status IN ('scheduled', 'confirmed')
)
UPDATE interview_bookings 
SET 
  status = 'cancelled',
  cancelled_at = NOW(),
  cancelled_reason = 'System cleanup: Reviewer was double-booked at this time slot'
WHERE id IN (SELECT booking_id FROM ranked_conflicts WHERE rn > 1);

-- =====================================================
-- Phase 2: Add trigger to prevent future double-booking
-- =====================================================

-- Function to check reviewer time uniqueness before inserting booking_reviewers
CREATE OR REPLACE FUNCTION public.check_reviewer_booking_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_start_at TIMESTAMPTZ;
  v_slot_end_at TIMESTAMPTZ;
  v_reviewer_id UUID;
BEGIN
  -- Get the slot details
  SELECT start_at, end_at, reviewer_id 
  INTO v_slot_start_at, v_slot_end_at, v_reviewer_id
  FROM interview_slots 
  WHERE id = NEW.slot_id;
  
  -- Check if this reviewer already has a booking at an overlapping time
  IF EXISTS (
    SELECT 1 
    FROM booking_reviewers br
    JOIN interview_slots ist ON ist.id = br.slot_id
    JOIN interview_bookings ib ON ib.id = br.booking_id
    WHERE ist.reviewer_id = v_reviewer_id
      AND br.status = 'assigned'
      AND ib.status IN ('scheduled', 'confirmed')
      AND br.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap
      AND ist.start_at < v_slot_end_at
      AND ist.end_at > v_slot_start_at
  ) THEN
    RAISE EXCEPTION 'Reviewer already has a booking at this time (% to %)', v_slot_start_at, v_slot_end_at;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on booking_reviewers
DROP TRIGGER IF EXISTS ensure_reviewer_uniqueness ON booking_reviewers;
CREATE TRIGGER ensure_reviewer_uniqueness
  BEFORE INSERT OR UPDATE ON booking_reviewers
  FOR EACH ROW
  EXECUTE FUNCTION check_reviewer_booking_uniqueness();

-- =====================================================
-- Phase 3: Create view for dynamic slot availability
-- =====================================================

-- Create a view that shows composite slots with real-time availability
CREATE OR REPLACE VIEW public.available_composite_slots AS
WITH booked_slots AS (
  -- Get all currently booked slot IDs
  SELECT DISTINCT br.slot_id
  FROM booking_reviewers br
  JOIN interview_bookings ib ON ib.id = br.booking_id
  WHERE br.status = 'assigned'
    AND ib.status IN ('scheduled', 'confirmed')
),
slot_availability AS (
  -- For each composite slot, count how many backing slots are still available
  SELECT 
    cs.id,
    cs.available_reviewer_count as total_reviewers,
    cs.available_reviewer_count - COUNT(bs.slot_id) as available_reviewers
  FROM composite_interview_slots cs
  LEFT JOIN LATERAL unnest(cs.backing_slot_ids) AS backing_id ON true
  LEFT JOIN booked_slots bs ON bs.slot_id = backing_id
  GROUP BY cs.id, cs.available_reviewer_count
)
SELECT 
  cs.id,
  cs.expertise_level_id,
  cs.industry_segment_id,
  cs.start_at,
  cs.end_at,
  GREATEST(sa.available_reviewers, 0) as available_reviewer_count,
  cs.backing_slot_ids,
  CASE 
    WHEN sa.available_reviewers <= 0 THEN 'full'
    ELSE cs.status
  END as status,
  cs.created_at,
  cs.updated_at
FROM composite_interview_slots cs
JOIN slot_availability sa ON sa.id = cs.id
WHERE cs.start_at > NOW();

-- Grant access to the view
GRANT SELECT ON public.available_composite_slots TO authenticated;

COMMENT ON VIEW public.available_composite_slots IS 'Dynamic view showing composite interview slots with real-time availability based on existing bookings';