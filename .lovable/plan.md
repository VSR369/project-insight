

# Platform Admin: Reviewer Availability Management

## Executive Summary

Implement a comprehensive admin dashboard to view and manage all reviewer interview slots with the following key features:
- **View only FUTURE slots** (past slots automatically filtered out)
- **Modify/Delete/Cancel** any slot with automatic reviewer notification
- **Create slots on behalf of any reviewer** (new capability for admins)

---

## Current State Analysis

### Database Status (Live Data)
| Reviewer | Future Open Slots | Email | Industries |
|----------|------------------|-------|------------|
| Test Robert Tester | 11 | Panel@cogniblend.com | Manufacturing, Auto Components |
| Dr. Sarah Chen | 0 | sarah.chen@test.com | EdTech, FinTech |
| James Wilson | 0 | james.wilson@test.com | EdTech, FinTech |
| Test Reviewer | 0 | reviewer@test.local | 9 industries |
| Joe Doe | 0 | media@co.in | Manufacturing |

### Existing Infrastructure
- `interview_slots` table has RLS policy: "Admins can manage slots" (ALL command)
- Composite slot trigger auto-refreshes when slots change
- Notification edge function pattern exists (`notify-booking-cancelled`)

---

## Implementation Plan

### Phase 1: Create Admin Hooks

**File:** `src/hooks/queries/useAdminReviewerSlots.ts`

#### Hook 1: `useAllReviewerSlots(filters)`
Query all interview slots joined with panel_reviewers, filtered by:
- **Date range filter** with `start_at > NOW()` as mandatory condition
- Reviewer name search (text)
- Industry segment multi-select
- Expertise level multi-select
- Status filter (open/booked/cancelled)

```typescript
interface SlotFilters {
  reviewerSearch: string;
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  status: 'all' | 'open' | 'booked' | 'cancelled';
}

// Query structure (simplified)
// Always includes: WHERE start_at > NOW()
// Returns: slot details + reviewer name, email, industries[], expertise[], timezone
```

#### Hook 2: `useAdminModifySlot()`
Update slot time with validation:
- Check for conflicts with other slots for same reviewer
- Send notification to reviewer via edge function

#### Hook 3: `useAdminDeleteSlot()`
Delete open slot:
- Verify slot is 'open' status
- Remove from database
- Send notification to reviewer

#### Hook 4: `useAdminCancelBookedSlot()`
Cancel a booked slot:
- Call existing `cancel_booked_slot_by_reviewer` RPC (or similar admin version)
- Send notification to both reviewer AND provider

#### Hook 5: `useAdminCreateSlotForReviewer()`
Create slots on behalf of a reviewer:
- Admin selects a reviewer from dropdown
- Admin picks date/time range
- Slot created with reviewer_id = selected reviewer
- Composite slots auto-refresh via trigger
- Send confirmation notification to reviewer

---

### Phase 2: Create Edge Function for Admin Notifications

**File:** `supabase/functions/notify-slot-modified-by-admin/index.ts`

Handles notifications for:
- Slot modified (time changed)
- Slot deleted (removed)
- Slot created on their behalf
- Booking cancelled

**Request format:**
```typescript
interface AdminSlotNotification {
  action: 'created' | 'modified' | 'deleted' | 'booking_cancelled';
  reviewer_email: string;
  reviewer_name: string;
  slot_date: string;
  slot_time: string;
  reason?: string;
  new_slot_time?: string;  // For modifications
  provider_email?: string; // For booking cancellations
  provider_name?: string;
}
```

---

### Phase 3: Create Admin Page Components

**Directory:** `src/pages/admin/reviewer-availability/`

#### Main Page: `ReviewerAvailabilityPage.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reviewer Availability Management                      [+ Add Slot for Reviewer] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Filters ───────────────────────────────────────────────────────────────┐│
│  │ 🔍 Search reviewer...  │ Industry ▼ │ Level ▼ │ From 📅 │ To 📅 │ Status ▼│
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Summary Cards ─────────────────────────────────────────────────────────┐│
│  │  📊 11 Future Slots  │  ✅ 11 Open  │  📅 0 Booked  │  👥 1 Reviewer     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Reviewer          │ Industries  │ Expertise    │ Date/Time      │ Status │ Actions ││
│  ├───────────────────┼─────────────┼──────────────┼────────────────┼────────┼─────────┤│
│  │ Test Robert       │ Mfg, Auto   │ All 5 levels │ Jan 26, 2026   │  Open  │ ✏️ 🗑️    ││
│  │ Tester            │ Components  │              │ 6:00-7:00 PM   │        │         ││
│  ├───────────────────┼─────────────┼──────────────┼────────────────┼────────┼─────────┤│
│  │ Test Robert       │ Mfg, Auto   │ All 5 levels │ Jan 26, 2026   │  Open  │ ✏️ 🗑️    ││
│  │ Tester            │ Components  │              │ 7:00-8:00 PM   │        │         ││
│  └───────────────────┴─────────────┴──────────────┴────────────────┴────────┴─────────┘│
│                                                                              │
│  ◀ 1 ▶                                              Showing 1-11 of 11      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Supporting Components:

| Component | Purpose |
|-----------|---------|
| `SlotFilters.tsx` | Collapsible filter bar with all filter options |
| `SummaryCards.tsx` | Stats cards showing totals |
| `ModifySlotDialog.tsx` | Date/time picker to change slot time |
| `DeleteSlotDialog.tsx` | Confirmation with reason field |
| `CancelBookingDialog.tsx` | For booked slots, shows provider info |
| `AddSlotForReviewerDialog.tsx` | Create slot on behalf of reviewer |
| `index.ts` | Barrel export |

---

### Phase 4: Add Slot For Reviewer Dialog

**Component:** `AddSlotForReviewerDialog.tsx`

**Flow:**
1. Admin clicks "+ Add Slot for Reviewer" button
2. Dialog opens with:
   - **Reviewer dropdown** (fetches all active reviewers)
   - **Date picker** (future dates only)
   - **Time range selector** (start/end time)
   - **Notification checkbox** (default: notify reviewer by email)
3. On submit:
   - Validate time is in future
   - Check for conflicts with reviewer's existing slots
   - Insert into `interview_slots`
   - Trigger auto-generates composite slots
   - Send notification email if checkbox enabled
4. Success toast: "Slot created for {Reviewer Name}"

**Form Fields:**
```typescript
interface AddSlotForm {
  reviewerId: string;     // Required - dropdown of active reviewers
  date: Date;             // Required - future date picker
  startTime: string;      // Required - time picker (e.g., "14:00")
  endTime: string;        // Required - time picker (e.g., "15:00")
  notifyReviewer: boolean; // Default: true
  adminNotes?: string;    // Optional - internal notes
}
```

---

### Phase 5: Navigation Updates

**File:** `src/components/admin/AdminSidebar.tsx`

Add new menu item under "Interview Setup":
```typescript
{ 
  title: 'Reviewer Availability', 
  icon: CalendarClock,  // From lucide-react
  path: '/admin/interview/reviewer-availability' 
}
```

**File:** `src/App.tsx`

Add route:
```typescript
<Route
  path="/admin/interview/reviewer-availability"
  element={
    <AdminGuard>
      <ReviewerAvailabilityPage />
    </AdminGuard>
  }
/>
```

---

## Technical Specifications

### Query: Fetch Future Slots with Reviewer Details

```sql
SELECT 
  is.id,
  is.start_at,
  is.end_at,
  is.status,
  is.cancelled_reason,
  is.cancelled_at,
  pr.id as reviewer_id,
  pr.name as reviewer_name,
  pr.email as reviewer_email,
  pr.timezone as reviewer_timezone,
  pr.industry_segment_ids,
  pr.expertise_level_ids
FROM interview_slots is
JOIN panel_reviewers pr ON pr.id = is.reviewer_id
WHERE is.start_at > NOW()  -- ALWAYS filter future only
  AND pr.is_active = true
  -- Additional filters applied dynamically
ORDER BY is.start_at ASC;
```

### Validation Rules

| Action | Validation |
|--------|------------|
| Create slot | Date/time must be in future; no overlap with reviewer's existing slots |
| Modify slot | New time must be in future; no overlap with other slots |
| Delete slot | Only status='open' slots can be deleted |
| Cancel booking | Verify slot is 'booked' status; notify both parties |

### Notification Triggers

| Action | Notify Reviewer | Notify Provider |
|--------|-----------------|-----------------|
| Create slot for reviewer | Yes (optional) | N/A |
| Modify slot time | Yes | Yes (if booked) |
| Delete open slot | Yes | N/A |
| Cancel booked slot | Yes | Yes |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/queries/useAdminReviewerSlots.ts` | Admin hooks for slot management |
| `src/pages/admin/reviewer-availability/ReviewerAvailabilityPage.tsx` | Main page |
| `src/pages/admin/reviewer-availability/SlotFilters.tsx` | Filter bar |
| `src/pages/admin/reviewer-availability/SummaryCards.tsx` | Stats display |
| `src/pages/admin/reviewer-availability/ModifySlotDialog.tsx` | Edit slot time |
| `src/pages/admin/reviewer-availability/DeleteSlotDialog.tsx` | Delete confirmation |
| `src/pages/admin/reviewer-availability/CancelBookingDialog.tsx` | Cancel booked slot |
| `src/pages/admin/reviewer-availability/AddSlotForReviewerDialog.tsx` | Create slot for reviewer |
| `src/pages/admin/reviewer-availability/index.ts` | Barrel export |
| `supabase/functions/notify-slot-modified-by-admin/index.ts` | Email notifications |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Reviewer Availability" menu item |
| `src/App.tsx` | Add route for `/admin/interview/reviewer-availability` |
| `supabase/config.toml` | Add edge function configuration |

---

## Security Considerations

1. **RLS Protection**: All queries use existing admin RLS policies
2. **Edge Function Auth**: Validates admin role before sending emails
3. **Audit Logging**: All actions logged via `logAuditEvent()`
4. **Reason Required**: Modifications require reason for audit trail

---

## Post-Implementation Validation

- [ ] Only future slots displayed (past slots filtered)
- [ ] Filter by reviewer name works
- [ ] Filter by industry/expertise works
- [ ] Create slot for any reviewer works
- [ ] Modify open slot updates time + notifies reviewer
- [ ] Delete open slot removes + notifies reviewer
- [ ] Cancel booked slot notifies both reviewer and provider
- [ ] Composite slots auto-refresh after changes
- [ ] Pagination works correctly
- [ ] Mobile responsive layout

