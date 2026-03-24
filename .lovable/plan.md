
Yes — I understand the requirement.  
You want structured sections (starting with Deliverables) to stay structured end-to-end, not collapse into free text, and to support item-level accept/reject (plus accept/reject all) from AI review/refinement.

## What is broken now
1. **Refinement is saved as raw string** in `CurationReviewPage.handleAcceptRefinement`, so structured fields can be stored as paragraph text.
2. **`AIReviewInline` has only one “Accept & Save” path**, no item-level acceptance for structured outputs.
3. **`refine-challenge-section` does not enforce structured JSON output** for deliverables, so the model can return prose.
4. **Review comments can be bundled** (multiple issues in one comment string), reducing usability for per-item handling.
5. Some text fields (e.g. `hook`) still render as plain text instead of rich content rendering.

## Implementation plan (Deliverables-first, reusable pattern)

### 1) Add structured refinement mode (Deliverables first)
- In `src/components/cogniblend/shared/AIReviewInline.tsx`:
  - Detect structured sections via a local section-mode map (start with `deliverables`).
  - Parse refined output into **discrete deliverable items** (JSON first, then safe fallback parsing).
  - Show an interactive list with:
    - item checkbox (accept/reject per item),
    - “Accept selected”, “Accept all”, “Reject selected”.
  - Keep existing text-section behavior unchanged.

### 2) Add comment-level selection for refinement instructions
- In `AIReviewInline`, add per-comment include/exclude toggles + “Select all / Clear all”.
- `Refine with AI` will use only selected comments.
- This gives immediate per-comment accept/reject control and reduces wasted AI calls/credits.

### 3) Enforce structured return for deliverables in edge refinement
- In `supabase/functions/refine-challenge-section/index.ts`:
  - For `section_key === 'deliverables'`, use tool/function schema output (strict JSON) instead of free text.
  - Required shape: one item per deliverable (array), no paragraph blob.
  - Return normalized JSON string payload to frontend.

### 4) Canonicalize on save (no distortion)
- In `src/pages/cogniblend/CurationReviewPage.tsx` `handleAcceptRefinement`:
  - For `deliverables`, always normalize to `{ items: string[] }` before DB update.
  - If payload invalid, block save with clear error toast (no silent corruption).
  - For text sections, normalize through `normalizeAiContentForEditor` before persistence.
  - Update `hook` render to use `AiContentRenderer` for rich formatting consistency.

### 5) Improve review comment atomicity for structured sections
- In `supabase/functions/review-challenge-sections/promptTemplate.ts` and `.../index.ts`:
  - Strengthen prompt rule: each actionable issue must be a separate comment element.
  - Add light post-processing fallback to split bundled numbered comments for `deliverables`.

## Files to update
1. `src/components/cogniblend/shared/AIReviewInline.tsx`
2. `src/pages/cogniblend/CurationReviewPage.tsx`
3. `supabase/functions/refine-challenge-section/index.ts`
4. `supabase/functions/review-challenge-sections/promptTemplate.ts`
5. `supabase/functions/review-challenge-sections/index.ts`

## Validation checklist (to protect credits)
1. Run AI review on Deliverables → comments appear as separate actionable items.
2. Refine Deliverables → proposed output appears as separate line items (not paragraph).
3. Accept one item only → DB stores only selected item(s) in structured JSON.
4. Accept all → DB stores full structured list.
5. Reload page → Deliverables still render as separate editable/deletable items.
6. Text section refine (e.g., Hook) → rich formatting preserved, not distorted/plain dump.

## Replication path after Deliverables is stable
- Reuse the same structured-mode pipeline for:
  - `evaluation_criteria`
  - `phase_schedule`
  - other itemized sections
without redesigning architecture again.
