
# Industry/Expertise Selection Enhancement for Reviewer Availability

## Executive Summary

Enable reviewers to see their enrolled industry segments and expertise levels at the top of the availability page, and allow them to select which specific industries and expertise levels each time slot should apply to. This prevents unwanted composite slots (e.g., "Aspiring" level) from being created for interview times.

---

## Root Cause Analysis

### Current Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Reviewer creates slot (no industry/expertise selection)                 │
│     └─► interview_slots (reviewer_id, start_at, end_at, status)             │
│                                                                              │
│  2. Trigger fires: refresh_composite_slots_for_time()                       │
│     └─► Uses CROSS JOIN UNNEST on panel_reviewers.industry_segment_ids     │
│     └─► Uses CROSS JOIN UNNEST on panel_reviewers.expertise_level_ids      │
│                                                                              │
│  3. Creates composite slots for ALL combinations from reviewer profile      │
│     └─► If reviewer has 2 industries × 5 levels = 10 composite slots       │
│     └─► INCLUDING "Aspiring" even if reviewer doesn't want it              │
│                                                                              │
│  RESULT: Providers see availability for ALL industry/expertise combos      │
│          regardless of reviewer intent                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Proposed Solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NEW FLOW                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Reviewer sees their enrolled qualifications at page top                 │
│     └─► Industries: [Manufacturing] [Technology]                            │
│     └─► Expertise: [Associate] [Senior] [Principal] [Partner]              │
│                                                                              │
│  2. When adding a slot, reviewer selects specific scope                     │
│     └─► ☑ Manufacturing  ☐ Technology                                       │
│     └─► ☐ Aspiring  ☑ Senior  ☑ Principal  ☐ Partner                       │
│                                                                              │
│  3. Slot saved with slot-level scope                                        │
│     └─► interview_slots.slot_industry_ids = [mfg_id]                        │
│     └─► interview_slots.slot_expertise_ids = [senior_id, principal_id]     │
│                                                                              │
│  4. Modified trigger uses slot-level arrays if present                      │
│     └─► Composite slots only for selected combinations                      │
│                                                                              │
│  RESULT: Providers see availability ONLY for intended combos               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database Migration

Add two new nullable columns to `interview_slots` table:

**File:** New migration file

```sql
ALTER TABLE interview_slots
  ADD COLUMN IF NOT EXISTS slot_industry_ids UUID[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slot_expertise_ids UUID[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN interview_slots.slot_industry_ids IS 
  'Specific industry segments for this slot. NULL = use reviewer full profile';
COMMENT ON COLUMN interview_slots.slot_expertise_ids IS 
  'Specific expertise levels for this slot. NULL = use reviewer full profile';
```

### Phase 2: Update Composite Slot Generation Function

**File:** New migration file (same as Phase 1)

Modify `refresh_composite_slots_for_time()` to check slot-level arrays first:

```sql
-- Key change in the SELECT:
-- Use COALESCE to prefer slot-level IDs, fall back to reviewer profile
COALESCE(s.slot_industry_ids, pr.industry_segment_ids) AS effective_industries,
COALESCE(s.slot_expertise_ids, pr.expertise_level_ids) AS effective_expertise,

-- Then UNNEST the effective arrays instead of reviewer profile directly
CROSS JOIN UNNEST(COALESCE(s.slot_industry_ids, pr.industry_segment_ids)) AS ind(id)
CROSS JOIN UNNEST(COALESCE(s.slot_expertise_ids, pr.expertise_level_ids)) AS el(id)
```

### Phase 3: Create Reviewer Enrollment Info Component

**File:** `src/components/reviewer/availability/ReviewerEnrollmentInfo.tsx`

Display reviewer's enrolled qualifications at page top:

| Element | Description |
|---------|-------------|
| Industry Badges | Show all enrolled industry segments as colored badges |
| Expertise Badges | Show all enrolled expertise levels as colored badges |
| Info Message | "Slots you create can be limited to specific industries and expertise levels" |

### Phase 4: Update DraftSlot Type

**File:** `src/services/availabilityService.ts`

Extend `DraftSlot` interface:

```typescript
export interface DraftSlot {
  date: Date;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  key: string;
  industryIds: string[];    // NEW: Selected industries for this slot
  expertiseIds: string[];   // NEW: Selected expertise levels for this slot
}
```

### Phase 5: Update TimeSlotSelector Component

**File:** `src/components/reviewer/availability/TimeSlotSelector.tsx`

Add industry/expertise selection UI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Add Availability                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Selected Date: Mon, Jan 27, 2026                                           │
│                                                                              │
│  Start Time: [10] : [00] [AM ▼]                                             │
│                                                                              │
│  Duration: [60 minutes ▼]                                                   │
│                                                                              │
│  ┌─ Industries ───────────────────────────────────────────────────────────┐ │
│  │ ☑ Manufacturing (Auto Components)                                      │ │
│  │ ☑ Technology (India IT Services)                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Expertise Levels ─────────────────────────────────────────────────────┐ │
│  │ ☐ Aspiring Industry Problem Solver                                     │ │
│  │ ☑ Associate Consultant                                                 │ │
│  │ ☑ Senior Consultant                                                    │ │
│  │ ☑ Principal Consultant                                                 │ │
│  │ ☑ Partner                                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Quick Presets: [9:00 AM] [12:00 PM] [2:00 PM] [5:00 PM]                    │
│                                                                              │
│  [+ Add Time Slot]                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Props Update:**
```typescript
interface TimeSlotSelectorProps {
  selectedDate: Date | null;
  onAddSlot: (slot: DraftSlot) => void;
  existingDraftKeys: Set<string>;
  reviewerIndustryIds: string[];    // NEW: From reviewer profile
  reviewerExpertiseIds: string[];   // NEW: From reviewer profile
}
```

**Behavior:**
- Default: All enrolled options selected
- Reviewer unchecks to exclude specific industries/expertise
- Validation: At least 1 industry and 1 expertise required
- Selections saved to DraftSlot

### Phase 6: Update CreateSlotInput Type

**File:** `src/hooks/queries/useReviewerAvailability.ts`

Extend input type:

```typescript
export interface CreateSlotInput {
  start_at: string;
  end_at: string;
  slot_industry_ids?: string[] | null;    // NEW
  slot_expertise_ids?: string[] | null;   // NEW
}
```

Update `useCreateReviewerSlots` mutation to include new fields.

### Phase 7: Update ReviewerAvailability Page

**File:** `src/pages/reviewer/ReviewerAvailability.tsx`

Changes:
1. Import and add `ReviewerEnrollmentInfo` component at page top
2. Pass `reviewer.industry_segment_ids` and `reviewer.expertise_level_ids` to `TimeSlotSelector`
3. Update `handleConfirmSelection` to pass slot-level IDs to mutation

### Phase 8: Update Barrel Export

**File:** `src/components/reviewer/availability/index.ts`

Add export for new `ReviewerEnrollmentInfo` component.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/reviewer/availability/ReviewerEnrollmentInfo.tsx` | Display enrolled qualifications |
| New migration SQL file | Add columns + update trigger function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/availabilityService.ts` | Extend DraftSlot interface with industryIds/expertiseIds |
| `src/components/reviewer/availability/TimeSlotSelector.tsx` | Add industry/expertise checkboxes |
| `src/hooks/queries/useReviewerAvailability.ts` | Update CreateSlotInput type and mutation |
| `src/pages/reviewer/ReviewerAvailability.tsx` | Add enrollment info, pass new props |
| `src/components/reviewer/availability/index.ts` | Export new component |

---

## Technical Specifications

### Validation Rules

| Rule | Enforcement |
|------|-------------|
| At least 1 industry selected | UI validation before adding slot |
| At least 1 expertise selected | UI validation before adding slot |
| Only enrolled options selectable | Checkbox options derived from reviewer profile |
| Future time only | Existing validation unchanged |
| No overlap | Existing validation unchanged |

### Default Behavior

- **New slots:** All enrolled industries/expertise pre-selected (checkboxes checked)
- **Existing slots (NULL arrays):** Continue working with full reviewer profile (backward compatible)

### Trigger Logic

```sql
-- Simplified pseudocode for updated trigger
FOR each open slot in time window:
  -- Use slot-level arrays if set, otherwise reviewer profile
  effective_industries = COALESCE(slot.slot_industry_ids, reviewer.industry_segment_ids)
  effective_expertise = COALESCE(slot.slot_expertise_ids, reviewer.expertise_level_ids)
  
  -- Generate composite slots only for effective combinations
  FOR each industry in effective_industries:
    FOR each expertise in effective_expertise:
      create_or_update_composite_slot(slot.time, industry, expertise)
```

---

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing slots with NULL arrays | Use reviewer's full profile (current behavior) |
| New slots with explicit arrays | Use only selected industries/expertise |
| Mixed slots (some NULL, some explicit) | Each slot handled independently |

---

## Testing Checklist

- [ ] Reviewer's enrolled industries/expertise display at page top
- [ ] Default selection shows all enrolled options checked
- [ ] Unchecking options excludes them from composite slots
- [ ] At least 1 industry and 1 expertise required (validation)
- [ ] Existing slots (NULL arrays) continue to work
- [ ] New slots with specific selections generate correct composite slots
- [ ] Slot modification preserves industry/expertise selection
- [ ] Admin view shows slot-level scope (existing admin page unchanged initially)
