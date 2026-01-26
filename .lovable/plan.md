
# Fix: Create Missing Database Functions for Interview Time Conflict Checking

## Problem Identified

The database functions `check_reviewer_time_conflict` and `check_enrollment_time_conflict` are referenced in the `book_interview_slot` and `select_reviewers_weighted` functions but were **never created** in any migration. This causes the error:

```
function check_enrollment_time_conflict(uuid, timestamp with time zone, timestamp with time zone, unknown) does not exist
```

## Root Cause Analysis

| Migration | What It Did | Problem |
|-----------|-------------|---------|
| `20260122120555_*.sql` | Created `book_interview_slot` referencing `check_enrollment_time_conflict` | Function was never created |
| `20260125180129_*.sql` | Created `select_reviewers_weighted` referencing `check_reviewer_time_conflict` | Function was never created |
| `20260122121245_*.sql` | Created `check_reviewer_booking_uniqueness` trigger | Different function (trigger, not helper) |

## Solution: Create Both Missing Functions

### Function 1: check_enrollment_time_conflict

This function checks if a provider's enrollment already has an active interview booking at an overlapping time window.

```sql
CREATE OR REPLACE FUNCTION public.check_enrollment_time_conflict(
  p_enrollment_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM interview_bookings ib
    WHERE ib.enrollment_id = p_enrollment_id
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap
      AND ib.scheduled_at < p_end_at
      AND (ib.scheduled_at + INTERVAL '60 minutes') > p_start_at
  )
$$;
```

**Logic:**
- Checks `interview_bookings` for the given enrollment
- Only considers active bookings (`scheduled` or `confirmed`)
- Excludes a specific booking if reschedule is in progress
- Returns `TRUE` if there's an overlapping booking (conflict exists)

### Function 2: check_reviewer_time_conflict

This function checks if a reviewer already has an active interview booking at an overlapping time window.

```sql
CREATE OR REPLACE FUNCTION public.check_reviewer_time_conflict(
  p_reviewer_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_reviewers br
    JOIN interview_slots ist ON ist.id = br.slot_id
    JOIN interview_bookings ib ON ib.id = br.booking_id
    WHERE ist.reviewer_id = p_reviewer_id
      AND br.status = 'assigned'
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap
      AND ist.start_at < p_end_at
      AND ist.end_at > p_start_at
  )
$$;
```

**Logic:**
- Checks `booking_reviewers` joined with `interview_slots` for the given reviewer
- Only considers assigned reviewers on active bookings
- Excludes a specific booking if reschedule is in progress
- Returns `TRUE` if there's an overlapping booking (conflict exists)

## Implementation

### Database Migration

A single migration file will create both functions:

```sql
-- =====================================================
-- Fix: Create missing time conflict checking functions
-- These are required by book_interview_slot and select_reviewers_weighted
-- =====================================================

-- 1. check_enrollment_time_conflict
-- Checks if an enrollment already has an active booking at the given time window
CREATE OR REPLACE FUNCTION public.check_enrollment_time_conflict(
  p_enrollment_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM interview_bookings ib
    WHERE ib.enrollment_id = p_enrollment_id
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap: booking overlaps with [p_start_at, p_end_at]
      AND ib.scheduled_at < p_end_at
      AND (ib.scheduled_at + INTERVAL '60 minutes') > p_start_at
  )
$$;

-- 2. check_reviewer_time_conflict
-- Checks if a reviewer already has an assigned booking at the given time window
CREATE OR REPLACE FUNCTION public.check_reviewer_time_conflict(
  p_reviewer_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_reviewers br
    JOIN interview_slots ist ON ist.id = br.slot_id
    JOIN interview_bookings ib ON ib.id = br.booking_id
    WHERE ist.reviewer_id = p_reviewer_id
      AND br.status = 'assigned'
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap: slot overlaps with [p_start_at, p_end_at]
      AND ist.start_at < p_end_at
      AND ist.end_at > p_start_at
  )
$$;

COMMENT ON FUNCTION check_enrollment_time_conflict IS 'Returns TRUE if the enrollment has an active booking overlapping the given time window';
COMMENT ON FUNCTION check_reviewer_time_conflict IS 'Returns TRUE if the reviewer has an assigned booking overlapping the given time window';
```

## Technical Notes

| Aspect | Detail |
|--------|--------|
| Security | Both use `SECURITY DEFINER` with explicit `search_path` to prevent privilege escalation |
| Performance | `STABLE` marking allows query optimization; indexes already exist on referenced tables |
| Null handling | Uses `COALESCE` to handle NULL `p_exclude_booking_id` parameter |
| Time overlap | Uses standard interval overlap logic: `A.start < B.end AND A.end > B.start` |

## Testing Verification

After migration:
1. Navigate to `/enroll/interview-slot` as a provider who has passed assessment
2. Attempt to book an interview slot
3. Booking should succeed without the "function does not exist" error
4. If provider has an existing booking, attempting to book another should show "You already have an active booking"
