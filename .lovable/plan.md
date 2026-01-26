
# Fix: RLS Policies for Reviewer Interview Slot Actions

## Root Cause Analysis

The Accept/Decline interview slot actions appear to succeed (PATCH returns 204 status) but the database is NOT actually updated. This is because:

1. **Missing RLS UPDATE policy on `booking_reviewers`**: Reviewers can only SELECT their own assignments but cannot UPDATE them
2. **Missing RLS UPDATE policy on `interview_bookings`**: Reviewers can only SELECT bookings they're assigned to but cannot UPDATE them

When PostgREST encounters an UPDATE that matches 0 rows (due to RLS), it still returns 204 (No Content) instead of an error. This is why the mutations appear to succeed but the UI doesn't update.

---

## Current RLS Policies

### `booking_reviewers` Table
| Policy | Command | Description |
|--------|---------|-------------|
| Admins can manage booking reviewers | ALL | Platform admins only |
| Booking reviewers visible to booking owner | SELECT | Providers who own the booking |
| Reviewers can view own assignments | SELECT | Reviewers for their own rows |
| **MISSING** | **UPDATE** | Reviewers cannot update their own assignments |

### `interview_bookings` Table
| Policy | Command | Description |
|--------|---------|-------------|
| Admins can manage all bookings | ALL | Platform admins only |
| Providers see own bookings | SELECT | Providers who own bookings |
| Providers can create/update own bookings | INSERT/UPDATE | Providers only |
| Reviewers can view assigned bookings | SELECT | Reviewers via function |
| **MISSING** | **UPDATE** | Reviewers cannot update bookings they're assigned to |

---

## Solution: Add RLS Policies via Migration

### New Policies Required

#### 1. `booking_reviewers` - UPDATE Policy for Reviewers
```sql
CREATE POLICY "Reviewers can update own acceptance status"
ON public.booking_reviewers
FOR UPDATE
TO authenticated
USING (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

#### 2. `interview_bookings` - UPDATE Policy for Assigned Reviewers
```sql
CREATE POLICY "Reviewers can update assigned bookings"
ON public.interview_bookings
FOR UPDATE
TO authenticated
USING (is_reviewer_assigned_to_booking(id))
WITH CHECK (is_reviewer_assigned_to_booking(id));
```

---

## Implementation Steps

### Step 1: Create Migration File
**File:** `supabase/migrations/20260126_add_reviewer_update_policies.sql`

```sql
-- =====================================================
-- Add UPDATE policies for reviewers on booking tables
-- Enables accept/decline interview slot functionality
-- =====================================================

-- 1. Allow reviewers to update their own booking_reviewers assignment
CREATE POLICY "Reviewers can update own acceptance status"
ON public.booking_reviewers
FOR UPDATE
TO authenticated
USING (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Allow reviewers to update interview bookings they are assigned to
CREATE POLICY "Reviewers can update assigned bookings"
ON public.interview_bookings
FOR UPDATE
TO authenticated
USING (is_reviewer_assigned_to_booking(id))
WITH CHECK (is_reviewer_assigned_to_booking(id));

-- 3. (Optional) Also allow reviewers to update enrollment lifecycle 
-- when declining with poor_credentials or reviewer_unavailable
-- This may require a separate policy on provider_industry_enrollments
```

---

## Additional Policy Consideration

The `useCancelAcceptedBooking` and `useDeclineInterviewSlot` mutations also update `provider_industry_enrollments` to revert lifecycle status. We need to check if reviewers have UPDATE access to that table:

```sql
-- Check for existing policies
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'provider_industry_enrollments';
```

If no UPDATE policy exists for reviewers on `provider_industry_enrollments`, we need to add one that allows reviewers to update enrollments for bookings they're assigned to.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDDHHMMSS_add_reviewer_update_policies.sql` | CREATE | New migration with RLS policies |

---

## Expected Outcome After Fix

1. Reviewer clicks "Accept Interview Slot"
2. PATCH to `booking_reviewers` succeeds AND updates the row
3. PATCH to `interview_bookings` succeeds AND updates the row
4. Query cache is invalidated
5. Refetch returns updated data with `acceptance_status: 'accepted'`
6. UI updates to show "ACCEPTED" status + Cancel button

---

## Verification Steps

After applying the migration:
1. Test Accept action - should update UI immediately
2. Test Decline action - should update UI immediately  
3. Test Cancel action (for accepted slots) - should update UI
4. Check database directly to confirm values changed
