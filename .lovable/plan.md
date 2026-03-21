

## Plan: Persist AI Review Comments & Per-Section Re-Review

### Root Causes
1. **AI reviews are only in React state** — `useState<SectionReview[]>([])` in CurationReviewPage.tsx. On navigation or re-login, all reviews vanish.
2. **No database storage** — The challenges table has no column for AI section reviews, and no dedicated table exists.
3. **Addressed sections show "Run Review Sections by AI"** — When `isAddressed` is true and the panel is clicked, it falls back to the "Pending" state message instead of triggering a fresh per-section review.

### Changes

#### 1. Database: Add `ai_section_reviews` JSONB column to `challenges` table
A single JSONB column stores the array of section reviews (section_key, status, comments, reviewed_at). This avoids a new table and keeps it simple — the data is small and always loaded with the challenge.

```sql
ALTER TABLE challenges ADD COLUMN ai_section_reviews jsonb DEFAULT NULL;
```

#### 2. Edge Function: `review-challenge-sections/index.ts`
- Accept optional `section_key` parameter — when provided, review only that single section (filtered prompt) instead of all sections
- After generating results, persist them to `challenges.ai_section_reviews` (merge with existing reviews for single-section mode)

#### 3. CurationReviewPage.tsx
- **Load on mount**: Read `challenge.ai_section_reviews` from the fetched challenge data and populate `aiReviews` state
- **Save after batch review**: After `handleAIReview` succeeds, persist the reviews to the DB column
- Pass `challengeId` to `CurationAIReviewInline` (already done)

#### 4. CurationAIReviewPanel.tsx — Key behavior changes
- **When review exists (not addressed)**: Show comments in expandable form (current behavior, works)
- **When addressed**: Instead of showing "Run Review Sections by AI", add a "Re-review this section" button that calls the edge function with `section_key` to get fresh per-section comments
  - If AI returns no issues → show "This section looks good — no issues found"
  - If AI returns comments → show them as normal
- **New prop**: `onSingleSectionReview(sectionKey)` callback or handle internally via supabase call
- Remove the "Pending" message that says "Run Review Sections by AI" — replace with the re-review button for addressed sections
- For truly never-reviewed sections (no batch review done yet), keep the "Pending" message

#### 5. State flow summary

```text
Never reviewed  →  "Pending" badge, collapsed, shows prompt text
Batch reviewed  →  Shows comments, auto-expands if warning/needs_revision  
Addressed       →  "Addressed" badge, collapsed, click → "Re-review" button
Re-reviewed     →  Shows fresh comments or "Good to go" message
```

### Files Modified
- **Migration**: Add `ai_section_reviews` JSONB column to `challenges`
- **`supabase/functions/review-challenge-sections/index.ts`**: Add single-section mode + persist results
- **`src/pages/cogniblend/CurationReviewPage.tsx`**: Load reviews from DB on mount, save after batch review
- **`src/components/cogniblend/curation/CurationAIReviewPanel.tsx`**: Add re-review capability for addressed sections, remove generic "Run Review Sections by AI" prompt for addressed state

