
Fix plan: Industry Segment is not persisting in a way pre-flight can read, so AI review keeps blocking.

## What is happening now
- DB check for challenge `8348e671-1174-48d8-b1f4-389290ea885a` shows:
  - `eligibility` = array JSON string (no `industry_segment_id`)
  - `targeting_filters` = empty
- Current save handler writes industry segment into `eligibility`, but that field is currently used/stored as an array-like payload in this record, so `industry_segment_id` is not reliably persisted.
- Pre-flight uses `resolveIndustrySegmentId()`, which currently does not fully handle all targeting_filters shapes used elsewhere.

## Implementation plan

### 1) Make industry segment persistence canonical in `targeting_filters`
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Update `handleIndustrySegmentChange` to save into `targeting_filters` (not `eligibility`).
- Persist both keys for compatibility:
  - `targeting_filters.industry_segment_id = <id>`
  - `targeting_filters.industries = [<id>]`
- Keep existing query invalidation and success/error toasts.

### 2) Harden industry segment resolver
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Update `resolveIndustrySegmentId()` fallback order to support both existing data formats:
  1. `targeting_filters.industry_segment_id`
  2. `targeting_filters.industries[0]`
  3. `eligibility.industry_segment_id` (only when eligibility parses to object, not array)
  4. `eligibility_model` (existing legacy fallback)

### 3) Remove race condition before refetch completes
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Add a local optimistic state/ref for the just-selected industry segment.
- Use this optimistic value in:
  - Context & Background rendering
  - Pre-flight check (`handleAIReview`)
- Clear/reconcile it after query refetch.

### 4) Align “from intake” detection with real data shapes
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Update intake attribution check to recognize both:
  - `targeting_filters.industry_segment_id`
  - `targeting_filters.industries[0]`
- Ensures badge/readonly logic reflects actual source correctly.

## Validation checklist
- Select industry segment in Context & Background.
- Verify PATCH payload includes `targeting_filters` with `industry_segment_id`.
- Verify DB row stores the selected segment under `targeting_filters`.
- Click AI Review immediately after selecting; pre-flight should no longer block for Industry Segment.
- Refresh page and confirm selected segment persists.
- Re-test old records where segment was set from intake and from wizard to ensure resolver works for both.
