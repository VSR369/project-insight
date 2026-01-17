-- =====================================================
-- Panel Interview Scheduling Feature - Full Schema
-- Creates tables for reviewers, slots, bookings, and quorum management
-- =====================================================

-- 1. Panel Reviewers - Stores reviewer profiles and expertise
CREATE TABLE IF NOT EXISTS public.panel_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  expertise_level_ids UUID[] NOT NULL DEFAULT '{}',
  industry_segment_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  max_interviews_per_day INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_panel_reviewers_active ON panel_reviewers(is_active);
CREATE INDEX IF NOT EXISTS idx_panel_reviewers_user ON panel_reviewers(user_id);

-- 2. Interview Slots - Individual reviewer availability
CREATE TABLE IF NOT EXISTS public.interview_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES panel_reviewers(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'held', 'booked', 'cancelled')),
  hold_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT unique_reviewer_slot UNIQUE (reviewer_id, start_at, end_at)
);

CREATE INDEX IF NOT EXISTS idx_interview_slots_reviewer_status ON interview_slots(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_interview_slots_start_at ON interview_slots(start_at);
CREATE INDEX IF NOT EXISTS idx_interview_slots_status_start ON interview_slots(status, start_at);

-- 3. Interview Quorum Requirements - Defines required reviewers per level
CREATE TABLE IF NOT EXISTS public.interview_quorum_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expertise_level_id UUID NOT NULL REFERENCES expertise_levels(id),
  industry_segment_id UUID REFERENCES industry_segments(id),
  required_quorum_count INTEGER NOT NULL DEFAULT 2,
  interview_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT unique_level_industry_quorum UNIQUE (expertise_level_id, industry_segment_id)
);

-- Insert default quorum requirements (2 reviewers for all existing levels)
INSERT INTO interview_quorum_requirements (expertise_level_id, required_quorum_count, interview_duration_minutes)
SELECT id, 2, 60 FROM expertise_levels WHERE is_active = true
ON CONFLICT (expertise_level_id, industry_segment_id) DO NOTHING;

-- 4. Composite Interview Slots - Pre-calculated slots with quorum met
CREATE TABLE IF NOT EXISTS public.composite_interview_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expertise_level_id UUID NOT NULL REFERENCES expertise_levels(id),
  industry_segment_id UUID NOT NULL REFERENCES industry_segments(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  available_reviewer_count INTEGER NOT NULL,
  backing_slot_ids UUID[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'booked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT unique_composite_slot UNIQUE (expertise_level_id, industry_segment_id, start_at, end_at)
);

CREATE INDEX IF NOT EXISTS idx_composite_slots_lookup ON composite_interview_slots(
  expertise_level_id, industry_segment_id, status, start_at
);

-- 5. Interview Bookings - Provider's booked interviews
CREATE TABLE IF NOT EXISTS public.interview_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id),
  enrollment_id UUID NOT NULL REFERENCES provider_industry_enrollments(id),
  composite_slot_id UUID REFERENCES composite_interview_slots(id),
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  reschedule_count INTEGER DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_provider ON interview_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_enrollment ON interview_bookings(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON interview_bookings(status, scheduled_at);

-- 6. Booking Reviewers - Links bookings to assigned reviewers
CREATE TABLE IF NOT EXISTS public.booking_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES interview_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES panel_reviewers(id),
  slot_id UUID NOT NULL REFERENCES interview_slots(id),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reviewers_booking ON booking_reviewers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviewers_reviewer ON booking_reviewers(reviewer_id);

-- =====================================================
-- Enable RLS on all tables
-- =====================================================

ALTER TABLE panel_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_quorum_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE composite_interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reviewers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for panel_reviewers
CREATE POLICY "Reviewers visible to authenticated users"
ON panel_reviewers FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage reviewers"
ON panel_reviewers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- RLS Policies for interview_slots
CREATE POLICY "Slots visible to authenticated"
ON interview_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage slots"
ON interview_slots FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- RLS Policies for interview_quorum_requirements
CREATE POLICY "Quorum requirements visible to authenticated"
ON interview_quorum_requirements FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage quorum requirements"
ON interview_quorum_requirements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- RLS Policies for composite_interview_slots
CREATE POLICY "Composite slots visible to authenticated"
ON composite_interview_slots FOR SELECT
TO authenticated
USING (status = 'open' AND start_at > NOW());

CREATE POLICY "Admins can manage composite slots"
ON composite_interview_slots FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- RLS Policies for interview_bookings
CREATE POLICY "Providers see own bookings"
ON interview_bookings FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM solution_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can create own bookings"
ON interview_bookings FOR INSERT
TO authenticated
WITH CHECK (
  provider_id IN (
    SELECT id FROM solution_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update own bookings"
ON interview_bookings FOR UPDATE
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM solution_providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all bookings"
ON interview_bookings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- RLS Policies for booking_reviewers
CREATE POLICY "Booking reviewers visible to booking owner"
ON booking_reviewers FOR SELECT
TO authenticated
USING (
  booking_id IN (
    SELECT ib.id FROM interview_bookings ib
    JOIN solution_providers sp ON ib.provider_id = sp.id
    WHERE sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage booking reviewers"
ON booking_reviewers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- =====================================================
-- Atomic Booking Function with Row Locking
-- =====================================================

CREATE OR REPLACE FUNCTION public.book_interview_slot(
  p_provider_id UUID,
  p_enrollment_id UUID,
  p_composite_slot_id UUID,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_composite_slot RECORD;
  v_enrollment RECORD;
  v_quorum_required INTEGER;
  v_booking_id UUID;
  v_locked_slot_ids UUID[];
  v_locked_count INTEGER;
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

  -- Step 3: Get quorum requirement
  SELECT required_quorum_count INTO v_quorum_required
  FROM interview_quorum_requirements
  WHERE expertise_level_id = v_enrollment.expertise_level_id
    AND (industry_segment_id IS NULL OR industry_segment_id = v_enrollment.industry_segment_id)
    AND is_active = true
  ORDER BY industry_segment_id NULLS LAST
  LIMIT 1;

  v_quorum_required := COALESCE(v_quorum_required, 2);

  -- Step 4: Lock individual slots with FOR UPDATE
  SELECT ARRAY_AGG(id) INTO v_locked_slot_ids
  FROM (
    SELECT is_tbl.id
    FROM interview_slots is_tbl
    WHERE is_tbl.id = ANY(v_composite_slot.backing_slot_ids)
      AND is_tbl.status = 'open'
    FOR UPDATE
    LIMIT v_quorum_required
  ) locked;

  v_locked_count := COALESCE(array_length(v_locked_slot_ids, 1), 0);

  IF v_locked_count < v_quorum_required THEN
    RETURN json_build_object('success', false, 'error', 
      format('Only %s of %s required reviewers available. Please select another slot.', v_locked_count, v_quorum_required));
  END IF;

  -- Step 5: Create booking
  INSERT INTO interview_bookings (
    provider_id, enrollment_id, composite_slot_id, 
    scheduled_at, status, created_by
  ) VALUES (
    p_provider_id, p_enrollment_id, p_composite_slot_id,
    v_composite_slot.start_at, 'scheduled', p_user_id
  ) RETURNING id INTO v_booking_id;

  -- Step 6: Update individual slots to 'booked'
  UPDATE interview_slots
  SET status = 'booked', updated_at = NOW()
  WHERE id = ANY(v_locked_slot_ids);

  -- Step 7: Link reviewers to booking
  INSERT INTO booking_reviewers (booking_id, reviewer_id, slot_id)
  SELECT v_booking_id, reviewer_id, id
  FROM interview_slots
  WHERE id = ANY(v_locked_slot_ids);

  -- Step 8: Update composite slot
  UPDATE composite_interview_slots
  SET status = 'booked', updated_at = NOW()
  WHERE id = p_composite_slot_id;

  -- Step 9: Update enrollment lifecycle
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
    'reviewer_count', v_locked_count
  );
END;
$$;

-- =====================================================
-- Cancel Booking Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.cancel_interview_booking(
  p_booking_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking RECORD;
  v_slot_ids UUID[];
BEGIN
  -- Get booking with lock
  SELECT * INTO v_booking
  FROM interview_bookings
  WHERE id = p_booking_id
    AND status IN ('scheduled', 'confirmed')
  FOR UPDATE;

  IF v_booking IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found or already cancelled');
  END IF;

  -- Get linked slot IDs
  SELECT ARRAY_AGG(slot_id) INTO v_slot_ids
  FROM booking_reviewers
  WHERE booking_id = p_booking_id;

  -- Update booking status
  UPDATE interview_bookings
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_reason = p_reason,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_booking_id;

  -- Release individual slots
  UPDATE interview_slots
  SET status = 'open', updated_at = NOW()
  WHERE id = ANY(v_slot_ids);

  -- Reopen composite slot
  UPDATE composite_interview_slots
  SET status = 'open', updated_at = NOW()
  WHERE id = v_booking.composite_slot_id;

  -- Reset enrollment lifecycle to assessment_passed
  UPDATE provider_industry_enrollments
  SET lifecycle_status = 'assessment_passed',
      lifecycle_rank = 110,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = v_booking.enrollment_id;

  RETURN json_build_object('success', true, 'message', 'Booking cancelled successfully');
END;
$$;

-- =====================================================
-- Add system settings for interview scheduling
-- =====================================================

INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('interview_default_duration_minutes', '{"value": 60}', 'Default interview duration in minutes'),
  ('interview_booking_advance_hours', '{"value": 24}', 'Minimum hours in advance to book an interview')
ON CONFLICT (setting_key) DO NOTHING;