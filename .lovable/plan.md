

# Fix: Reviewer Slots Not Visible to Solution Providers

## Root Cause Analysis

### Summary
The interview scheduling system has a **critical data flow gap**: individual reviewer slots (`interview_slots`) are NOT being aggregated into `composite_interview_slots`, which is what providers see when scheduling.

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT STATE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  REVIEWER                       MISSING LINK                PROVIDER    │
│  ────────                       ────────────                ────────    │
│                                                                         │
│  ┌──────────────┐                  ?                 ┌──────────────┐   │
│  │ interview_   │ ───────────── NO TRIGGER ────────▶ │ composite_   │   │
│  │ slots        │              NO FUNCTION           │ interview_   │   │
│  │ (13 records) │              NO SCHEDULER          │ slots        │   │
│  └──────────────┘                                    │ (0 records!) │   │
│                                                      └──────────────┘   │
│                                                             │           │
│                                                             ▼           │
│                                                      ┌──────────────┐   │
│                                                      │ useComposite │   │
│                                                      │ Slots hook   │   │
│                                                      │ returns []   │   │
│                                                      └──────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Evidence

| Table | Records | Status |
|-------|---------|--------|
| `interview_slots` | 13 open slots | Data EXISTS |
| `composite_interview_slots` | 0 records | EMPTY |
| `available_composite_slots` (view) | 0 records | Depends on empty table |

### Provider Enrollment Status

The provider "Robert Johnson" has enrollment for **Manufacturing (Auto Components)** at `lifecycle_rank=110` (assessment_passed) - eligible for interview scheduling, but no composite slots exist for this industry/expertise combination.

---

## Solution Options

### Option A: Create Trigger-Based Auto-Generation (Recommended)

Create a database trigger that automatically generates/updates composite slots whenever:
1. A reviewer creates new availability slots
2. A reviewer updates their availability
3. A reviewer cancels a slot

**Pros:**
- Real-time synchronization
- No manual intervention needed
- Works with any number of reviewers

**Cons:**
- More complex trigger logic

### Option B: Modify Query to Use Dynamic View

Replace the static table query with a dynamically-generated view that computes composite slots on-the-fly from `interview_slots`.

**Pros:**
- Always up-to-date
- No synchronization issues

**Cons:**
- Potentially slower for large datasets
- More complex SQL

### Option C: Hybrid Approach (Selected)

1. Create a database function `refresh_composite_slots()` that generates composite slots
2. Call it via trigger on `interview_slots` changes
3. Keep the existing table structure for booking operations

---

## Implementation Plan

### Phase 1: Create Composite Slot Generation Function

Create a PostgreSQL function that:
1. Queries all open `interview_slots` with their reviewer's `expertise_level_ids` and `industry_segment_ids`
2. Groups slots by `start_at`, `end_at`, `expertise_level_id`, `industry_segment_id`
3. Creates/updates `composite_interview_slots` records with `backing_slot_ids` array

```sql
CREATE OR REPLACE FUNCTION public.refresh_composite_slots_for_time(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
) RETURNS void AS $$
BEGIN
  -- For each unique combination of time + expertise + industry,
  -- find all matching reviewer slots and create/update composite slot
  ...
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Create Trigger on interview_slots

Add trigger to call the refresh function when slots are inserted, updated, or deleted:

```sql
CREATE TRIGGER trg_refresh_composite_slots
  AFTER INSERT OR UPDATE OR DELETE ON interview_slots
  FOR EACH ROW
  EXECUTE FUNCTION handle_interview_slot_change();
```

### Phase 3: Run Initial Population

Execute a one-time migration to populate composite slots from existing interview_slots data:

```sql
-- Generate composite slots for all existing open interview_slots
SELECT refresh_all_composite_slots();
```

### Phase 4: Update Frontend Query (Optional)

If needed, update `useCompositeSlots` to also check the dynamic view as fallback.

---

## Database Migration Details

### Function: generate_composite_slots_for_slot()

This function will:
1. Get the slot's time range and reviewer's coverage (industries + expertise levels)
2. For each combination of industry_segment_id + expertise_level_id the reviewer covers:
   - Check if a composite slot exists for that time + industry + expertise
   - If exists: add this slot_id to backing_slot_ids array
   - If not: create new composite slot

### Trigger Logic

```
ON INSERT interview_slot:
  → Generate composite slots for all industry+expertise combinations this reviewer covers

ON UPDATE interview_slot (status change to cancelled):
  → Remove this slot from any composite slots' backing_slot_ids
  → Delete composite slots with empty backing_slot_ids

ON DELETE interview_slot:
  → Same as cancellation
```

---

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Add composite slot generation function and trigger |
| (No frontend changes needed) | Hook already queries correct table |

---

## Validation Checklist

After implementation:
- [ ] Reviewer creates slot → composite slots auto-generated
- [ ] Reviewer cancels slot → composite slots updated
- [ ] Provider sees available slots for their industry/expertise
- [ ] Booking flow works (books composite slot, assigns reviewers)
- [ ] Multiple reviewers at same time → single composite with higher reviewer_count

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Trigger performance | Use targeted refresh (only affected time/industry/expertise) |
| Orphaned composite slots | Cleanup in trigger when backing_slot_ids becomes empty |
| Race conditions | Use `FOR UPDATE` locks on composite slots during modification |

