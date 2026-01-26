
# Implementation Plan: Connect Industry/Expertise Selection to Composite Slot Generation

## Executive Summary

Reviewers can already select specific industry segments and expertise levels when creating availability slots in the UI. However, this metadata is **not being saved to the database**. This plan connects the UI selections through to the database and ensures the composite slot generation trigger respects slot-level metadata for visibility filtering.

---

## Business Logic Confirmation

| Concept | Behavior |
|---------|----------|
| **Reviewer Enrollment** | Reviewers select industry segments and expertise levels during registration |
| **Slot Visibility** | When a slot is open, it is visible only to solution providers matching the slot's industry/expertise scope |
| **Booking Exclusivity** | Once ANY provider books a slot, the reviewer becomes unavailable for ALL industry/expertise combinations at that time (one person cannot do two interviews) |
| **Composite Slots** | System-managed aggregation of individual reviewer availability; only shown when quorum requirements are met |

---

## Current State Analysis

| Layer | Current Status | Gap |
|-------|----------------|-----|
| `TimeSlotSelector.tsx` | Collects `industrySegmentIds` and `expertiseLevelIds` in DraftSlot | Working correctly |
| `ReviewerAvailability.tsx` | Creates `slotsToCreate` but only includes `start_at` and `end_at` | Drops metadata |
| `useReviewerAvailability.ts` | `CreateSlotInput` only has `start_at` and `end_at` | Missing industry/expertise fields |
| `interview_slots` table | Has `slot_industry_ids` and `slot_expertise_ids` columns | Not being populated |
| Database trigger | Uses `panel_reviewers` profile IDs | Needs to check slot-level IDs first |

---

## Implementation Phases

### Phase 1: Update Slot Creation Hook

**File:** `src/hooks/queries/useReviewerAvailability.ts`

**Changes:**
1. Extend `CreateSlotInput` interface to include optional industry/expertise arrays
2. Update the mutation to include these fields when inserting

**Before (lines 40-43):**
```typescript
export interface CreateSlotInput {
  start_at: string;
  end_at: string;
}
```

**After:**
```typescript
export interface CreateSlotInput {
  start_at: string;
  end_at: string;
  slot_industry_ids?: string[];
  slot_expertise_ids?: string[];
}
```

**Mutation update (lines 125-130):**
```typescript
const slotsToInsert = slots.map((slot) => ({
  reviewer_id: reviewerId,
  start_at: slot.start_at,
  end_at: slot.end_at,
  status: 'open' as const,
  // Only include if explicitly selected (empty = all reviewer's enrollments)
  slot_industry_ids: slot.slot_industry_ids?.length ? slot.slot_industry_ids : null,
  slot_expertise_ids: slot.slot_expertise_ids?.length ? slot.slot_expertise_ids : null,
}));
```

---

### Phase 2: Pass Metadata from UI to Hook

**File:** `src/pages/reviewer/ReviewerAvailability.tsx`

**Changes:**
Update `handleConfirmSelection` to include industry/expertise IDs from draft slots.

**Before (lines 184-189):**
```typescript
const slotsToCreate = draftSlots.map((draft) => {
  const timeSlot = draftToTimeSlot(draft);
  return {
    start_at: timeSlot.startAt.toISOString(),
    end_at: timeSlot.endAt.toISOString(),
  };
});
```

**After:**
```typescript
const slotsToCreate = draftSlots.map((draft) => {
  const timeSlot = draftToTimeSlot(draft);
  return {
    start_at: timeSlot.startAt.toISOString(),
    end_at: timeSlot.endAt.toISOString(),
    slot_industry_ids: draft.industrySegmentIds,
    slot_expertise_ids: draft.expertiseLevelIds,
  };
});
```

---

### Phase 3: Display Industry/Expertise Badges in Selected Slots Panel

**File:** `src/components/reviewer/availability/SelectedSlotsPanel.tsx`

**Changes:**
1. Import `useIndustrySegments` and `useExpertiseLevels` hooks
2. Create lookup maps for ID-to-name resolution
3. Display badges on draft slots showing selected industries and expertise levels

**New UI for draft slots (after line 133):**
```tsx
{/* Industry/Expertise scope indicators */}
<div className="flex flex-wrap gap-1 mt-1">
  {slot.industrySegmentIds.length > 0 ? (
    slot.industrySegmentIds.map(id => (
      <Badge key={id} variant="outline" className="text-xs bg-blue-50">
        {industryMap.get(id) || id.slice(0, 8)}
      </Badge>
    ))
  ) : (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      All Industries
    </Badge>
  )}
  {slot.expertiseLevelIds.length > 0 ? (
    slot.expertiseLevelIds.map(id => (
      <Badge key={id} variant="outline" className="text-xs bg-green-50">
        {expertiseMap.get(id) || id.slice(0, 8)}
      </Badge>
    ))
  ) : (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      All Levels
    </Badge>
  )}
</div>
```

---

### Phase 4: Update Composite Slot Generation Trigger

**Type:** Database Migration

**Purpose:** The trigger function should use slot-level metadata when available, falling back to reviewer profile when not specified.

**Current logic in `refresh_composite_slots_for_time`:**
```sql
CROSS JOIN UNNEST(pr.expertise_level_ids) AS el(id)
CROSS JOIN UNNEST(pr.industry_segment_ids) AS ind(id)
```

**Updated logic:**
```sql
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
```

This ensures:
- If reviewer specifies industries/levels for a slot: Only those combinations generate composite slots
- If reviewer leaves them empty (null): All enrolled combinations generate composite slots (backward compatible)

---

## Technical Summary

### Data Flow After Implementation

```text
TimeSlotSelector
     |
     | selectedIndustryIds, selectedExpertiseIds
     v
DraftSlot { industrySegmentIds, expertiseLevelIds }
     |
     | handleConfirmSelection
     v
CreateSlotInput { slot_industry_ids, slot_expertise_ids }
     |
     | useCreateReviewerSlots mutation
     v
interview_slots table (slot_industry_ids, slot_expertise_ids populated)
     |
     | Database trigger (trg_refresh_composite_slots)
     v
composite_interview_slots (visibility filtered by slot-level or profile-level IDs)
```

### Files to Modify

| File | Change Type | Phase |
|------|-------------|-------|
| `src/hooks/queries/useReviewerAvailability.ts` | Extend interface + update mutation | 1 |
| `src/pages/reviewer/ReviewerAvailability.tsx` | Pass slot metadata to mutation | 2 |
| `src/components/reviewer/availability/SelectedSlotsPanel.tsx` | Display industry/expertise badges | 3 |
| Database migration | Update `refresh_composite_slots_for_time` function | 4 |

### Booking Conflict Logic (No Changes Needed)

The existing booking logic already handles the "one person can't do two interviews" rule correctly:

1. When a slot is booked, its status changes from `'open'` to `'booked'`
2. The composite slot trigger recalculates `backing_slot_ids` excluding booked slots
3. This removes the reviewer from ALL composite slots at that time window

**No changes needed to booking logic** - the visibility filtering happens at the composite slot level, and once booked, the underlying `interview_slot` status change propagates globally for the reviewer.

---

## Testing Checklist

- Create slot with specific industry/expertise selection - verify database stores values
- Create slot with NO selection (empty arrays) - verify composite slots generated for ALL reviewer enrollments
- Verify composite slots only show for selected industry/expertise combinations
- Book a slot - verify it becomes unavailable across ALL industry/expertise combinations
- Verify draft slots show industry/expertise badges in panel
- Verify existing slots (open and booked) display correctly
