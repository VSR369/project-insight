-- =====================================================
-- Add cancelled status support to interview_slots
-- and create RPC function for reviewer-initiated cancellation
-- =====================================================

-- Add cancellation tracking columns to interview_slots
ALTER TABLE public.interview_slots 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Create function to cancel a booked slot from reviewer side
-- This cancels the entire booking when a reviewer cancels their slot
CREATE OR REPLACE FUNCTION public.cancel_booked_slot_by_reviewer(
  p_slot_id UUID,
  p_reviewer_id UUID,
  p_reason TEXT DEFAULT 'Reviewer cancelled availability'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot RECORD;
  v_booking RECORD;
  v_provider RECORD;
  v_enrollment RECORD;
  v_all_slot_ids UUID[];
BEGIN
  -- Step 1: Validate the slot belongs to this reviewer and is booked
  SELECT * INTO v_slot
  FROM interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_slot IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF v_slot.reviewer_id != p_reviewer_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only cancel your own slots');
  END IF;

  IF v_slot.status != 'booked' THEN
    RETURN json_build_object('success', false, 'error', 'This slot is not booked. Status: ' || v_slot.status);
  END IF;

  -- Step 2: Find the booking linked to this slot
  SELECT ib.* INTO v_booking
  FROM interview_bookings ib
  JOIN booking_reviewers br ON br.booking_id = ib.id
  WHERE br.slot_id = p_slot_id
    AND ib.status IN ('scheduled', 'confirmed')
  LIMIT 1;

  IF v_booking IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active booking found for this slot');
  END IF;

  -- Step 3: Get provider and enrollment details for notification
  SELECT sp.*, p.email as provider_email
  INTO v_provider
  FROM solution_providers sp
  LEFT JOIN profiles p ON p.user_id = sp.user_id
  WHERE sp.id = v_booking.provider_id;

  SELECT pie.*, ind.name as industry_name, exp.name as expertise_name
  INTO v_enrollment
  FROM provider_industry_enrollments pie
  LEFT JOIN industry_segments ind ON ind.id = pie.industry_segment_id
  LEFT JOIN expertise_levels exp ON exp.id = pie.expertise_level_id
  WHERE pie.id = v_booking.enrollment_id;

  -- Step 4: Get all slot IDs linked to this booking
  SELECT ARRAY_AGG(slot_id) INTO v_all_slot_ids
  FROM booking_reviewers
  WHERE booking_id = v_booking.id;

  -- Step 5: Cancel the booking
  UPDATE interview_bookings
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_reason = p_reason,
      updated_at = NOW()
  WHERE id = v_booking.id;

  -- Step 6: Update all linked slots to 'cancelled'
  UPDATE interview_slots
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = (SELECT user_id FROM panel_reviewers WHERE id = p_reviewer_id),
      cancelled_reason = p_reason,
      updated_at = NOW()
  WHERE id = ANY(v_all_slot_ids);

  -- Step 7: Update composite slot to cancelled
  UPDATE composite_interview_slots
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_booking.composite_slot_id;

  -- Step 8: Reset enrollment lifecycle to assessment_passed
  UPDATE provider_industry_enrollments
  SET lifecycle_status = 'assessment_passed',
      lifecycle_rank = 110,
      updated_at = NOW()
  WHERE id = v_booking.enrollment_id;

  -- Return success with details for email notification
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'provider_id', v_booking.provider_id,
    'provider_name', COALESCE(v_provider.first_name || ' ' || v_provider.last_name, 'Provider'),
    'provider_email', v_provider.provider_email,
    'scheduled_at', v_booking.scheduled_at,
    'industry_name', v_enrollment.industry_name,
    'expertise_name', v_enrollment.expertise_name,
    'cancelled_slots_count', array_length(v_all_slot_ids, 1)
  );
END;
$$;