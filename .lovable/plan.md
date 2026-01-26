
# Reviewer Availability: Industry/Expertise Selection Enhancement

## Problem Statement

Currently when a reviewer creates availability slots:
1. They cannot see which industry segments and expertise levels they are enrolled in
2. They have no control over which industry/expertise combinations their slots apply to
3. Composite slots are generated for ALL combinations in their profile, leading to incorrect availability (e.g., "Aspiring" level slots appearing when the reviewer only wants to conduct "Senior" interviews)

## Root Cause Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (Problem)                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Reviewer creates slot                                                    │
│     └─► interview_slots (reviewer_id, start_at, end_at, status)             │
│                                                                              │
│  2. Trigger fires: refresh_composite_slots_for_time()                       │
│     └─► Uses CROSS JOIN UNNEST on panel_reviewers.industry_segment_ids     │
│     └─► Uses CROSS JOIN UNNEST on panel_reviewers.expertise_level_ids      │
│                                                                              │
│  3. Creates composite slots for ALL combinations                            │
│     └─► If reviewer has 2 industries × 5 levels = 10 composite slots       │
│     └─► INCLUDING "Aspiring" even if reviewer doesn't want it              │
│                                                                              │
│  RESULT: Providers see availability for industry/expertise combinations     │
│          the reviewer didn't intend to offer                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Proposed Solution

### Phase 1: Display Reviewer's Enrolled Info (UI Enhancement)

Add a profile section at the top of `/reviewer/availability` showing:
- Reviewer's enrolled **Industry Segments** (badges)
- Reviewer's enrolled **Expertise Levels** (badges)
- Visual confirmation of their qualifications

**Component:** `ReviewerEnrollmentInfo.tsx`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Manage Availability                                        Times in IST    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─ Your Review Qualifications ─────────────────────────────────────────────┐│
│ │                                                                          ││
│ │  Industries:  [Manufacturing] [Technology (India IT Services)]          ││
│ │                                                                          ││
│ │  Expertise:   [Aspiring] [Associate] [Senior] [Principal] [Partner]     ││
│ │                                                                          ││
│ │  ℹ️ Availability you create will be visible for ALL your enrolled       ││
│ │     industry and expertise combinations.                                 ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│ [Calendar...]                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Add Slot-Level Industry/Expertise Selection (Data Model Change)

**Database Change Required:**
Add optional columns to `interview_slots` table to store slot-specific scope:

```sql
ALTER TABLE interview_slots
  ADD COLUMN slot_industry_ids UUID[] DEFAULT NULL,
  ADD COLUMN slot_expertise_ids UUID[] DEFAULT NULL;
```

- **NULL = use reviewer's full profile** (backward compatible)
- **Array values = use only these specific IDs**

**Trigger Modification:**
Update `refresh_composite_slots_for_time()` to:
1. Check if slot has `slot_industry_ids` / `slot_expertise_ids`
2. If set, use those instead of reviewer's full profile
3. If NULL, fall back to current behavior

### Phase 3: Slot Creation UI Enhancement

**Update `TimeSlotSelector.tsx`:**

Add selection controls when adding a slot:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Add Time Slot for January 27, 2026                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Start Time: [10:00 AM ▼]    End Time: [11:00 AM ▼]                         │
│                                                                              │
│  ┌─ Industries for this slot ─────────────────────────────────────────────┐ │
│  │ ☑️ Manufacturing (Auto Components)                                      │ │
│  │ ☑️ Technology (India IT Services)                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Expertise Levels for this slot ────────────────────────────────────────┐ │
│  │ ☐ Aspiring Industry Problem Solver                                      │ │
│  │ ☑️ Associate Consultant                                                  │ │
│  │ ☑️ Senior Consultant                                                     │ │
│  │ ☑️ Principal Consultant                                                  │ │
│  │ ☑️ Partner                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [ Cancel ]                                              [ Add Slot ]       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Default: All enrolled industries/expertise selected
- Reviewer can uncheck to exclude
- At least 1 industry and 1 expertise must be selected
- Selection is saved to `slot_industry_ids` and `slot_expertise_ids`

---

## Implementation Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/reviewer/availability/ReviewerEnrollmentInfo.tsx` | Display enrolled industries/expertise at top of page |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/reviewer/ReviewerAvailability.tsx` | Add ReviewerEnrollmentInfo component |
| `src/components/reviewer/availability/TimeSlotSelector.tsx` | Add industry/expertise checkboxes |
| `src/services/availabilityService.ts` | Update DraftSlot type to include selections |
| `src/hooks/queries/useReviewerAvailability.ts` | Update CreateSlotInput to include arrays |
| `supabase/migrations/new_migration.sql` | Add slot_industry_ids, slot_expertise_ids columns |
| `supabase/migrations/new_migration.sql` | Update trigger to use slot-level arrays |

### Database Migration

```sql
-- Phase 1: Add slot-level scope columns
ALTER TABLE interview_slots
  ADD COLUMN IF NOT EXISTS slot_industry_ids UUID[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slot_expertise_ids UUID[] DEFAULT NULL;

-- Phase 2: Update composite slot generation function
-- Modify refresh_composite_slots_for_time to check slot-level arrays first
```

### Trigger Logic Update

```sql
-- In refresh_composite_slots_for_time:
-- 1. If slot.slot_industry_ids IS NOT NULL, use those
-- 2. Else use panel_reviewers.industry_segment_ids
-- Same for expertise levels
```

---

## Technical Specifications

### DraftSlot Type Update

```typescript
interface DraftSlot {
  key: string;
  date: Date;
  startTime: string;
  endTime: string;
  industryIds: string[];    // NEW: Selected industries for this slot
  expertiseIds: string[];   // NEW: Selected expertise levels for this slot
}
```

### CreateSlotInput Update

```typescript
interface CreateSlotInput {
  start_at: string;
  end_at: string;
  slot_industry_ids?: string[] | null;
  slot_expertise_ids?: string[] | null;
}
```

### Validation Rules

| Rule | Description |
|------|-------------|
| At least 1 industry | Cannot save slot without at least one industry selected |
| At least 1 expertise | Cannot save slot without at least one expertise selected |
| Only enrolled options | Can only select from reviewer's enrolled industries/expertise |
| Future time only | Start time must be in the future |
| No overlap | Cannot overlap with existing slots |

---

## Backward Compatibility

- **Existing slots:** `slot_industry_ids = NULL` and `slot_expertise_ids = NULL` means "use reviewer's full profile" (current behavior preserved)
- **New slots:** Explicitly set the arrays based on reviewer selection
- **Trigger handles both:** Checks for slot-level arrays first, falls back to profile

---

## Security Considerations

1. **Validation:** Backend must validate that selected IDs are a subset of reviewer's enrolled IDs
2. **RLS:** Existing policies continue to work (slot ownership verified)
3. **No privilege escalation:** Reviewer cannot add industries/expertise they're not enrolled in

---

## Testing Checklist

- [ ] Enrolled industries/expertise display correctly at page top
- [ ] Default selection shows all enrolled options checked
- [ ] Unchecking "Aspiring" excludes it from composite slots
- [ ] At least 1 industry and 1 expertise required
- [ ] Existing slots (NULL arrays) continue to work
- [ ] New slots with specific selections generate correct composite slots
- [ ] Slot modification preserves industry/expertise selection
- [ ] Admin view shows slot-level scope (optional enhancement)

---

## Summary

This enhancement gives reviewers control over which industry/expertise combinations their availability applies to, preventing unwanted slots (like "Aspiring" level) from appearing in the provider booking flow. The solution is backward compatible and maintains data integrity through validation.
