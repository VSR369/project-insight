

# Three Fixes: AI Review Coverage, Master Data in Prompts, Phase Schedule Format

## Issues Found

### 1. AI Review Skips Some Sections
The edge function sends all ~27 section keys to the AI in one batch. The AI model sometimes skips sections when the batch is too large (it returns reviews for some but not all). The backfill logic (line 408-419) marks skipped sections as "pass" with empty comments — so they get a green status with no actual feedback. This is misleading.

**Root cause**: Too many sections in a single LLM call. The AI model truncates output.

### 2. Master Data Not Injected Into Review Prompts
When the AI reviews master-data sections (eligibility, visibility, ip_model, maturity_level, complexity), it has no knowledge of what the valid options are. The prompt says "checkbox_single" or "checkbox_multi" but doesn't list the allowed values. So the AI gives generic prose feedback instead of recommending specific master-data codes.

**Root cause**: `buildConfiguredBatchPrompt` in `promptTemplate.ts` doesn't receive or inject master-data options into the prompt text.

### 3. Phase Schedule Format Is Wrong
- The `ScheduleTableSectionRenderer` only shows 3 columns: Phase, Name, Duration (days)
- The spec requires: Deliverable/Phase Name, Duration, Start Date, End Date
- The prompt template tells AI to output `phase_name, start_date, end_date, milestone, dependencies` but the renderer ignores start_date/end_date
- The data model also doesn't consistently use these fields

## Implementation Plan

### Fix 1: Batch-Split AI Review for Full Coverage

**File: `supabase/functions/review-challenge-sections/index.ts`**

Split the sections into batches of max 12 per LLM call (configurable). For each batch:
- Build a separate system prompt with only those sections
- Call the AI gateway
- Collect results
- Merge all batch results together before persisting

This ensures no section is skipped due to output truncation. Remove the misleading backfill-as-"pass" logic — if a section truly gets no response after batching, flag it as `"warning"` with comment "Review could not be completed."

### Fix 2: Inject Master Data Options Into Review Prompt

**File: `supabase/functions/review-challenge-sections/index.ts`**

After fetching challenge data, also fetch master data for sections that need it:
- `md_solver_eligibility` → for eligibility
- `md_challenge_complexity` → for complexity  
- IP model options, maturity levels (from constants or DB)

**File: `supabase/functions/review-challenge-sections/promptTemplate.ts`**

Add an optional `allowedOptions` parameter to the batch prompt builder. For each section that has master-data backing, append to the prompt:
```
Allowed values for eligibility: ["registered", "signed_in", "certified_solver", "open_community"]
You MUST only suggest values from this list.
```

This applies to: eligibility, visibility, ip_model, maturity_level, complexity, challenge_visibility, effort_level.

### Fix 3: Phase Schedule — Correct Columns and Renderer

**File: `src/components/cogniblend/curation/renderers/ScheduleTableSectionRenderer.tsx`**

Rewrite table to show 4 columns: Phase/Deliverable, Duration (days), Start Date, End Date. Support reading both old format (`phase`, `name`, `duration_days`) and new format (`phase_name`, `start_date`, `end_date`, `duration_days`). Add editing support (add/remove rows, inline edit).

**File: `src/lib/cogniblend/curationSectionFormats.ts`**

Already has correct columns: `['phase_name', 'start_date', 'end_date', 'duration_days', 'milestone', 'dependencies']`. No change needed.

**File: `supabase/functions/review-challenge-sections/promptTemplate.ts`**

Update `schedule_table` format instruction to:
```
Output: a JSON array of phase objects with keys: phase_name (string), duration_days (number), start_date (ISO date string or null), end_date (ISO date string or null). AI should propose realistic dates based on challenge scope and complexity.
```

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

Update the `phase_schedule` render case and the `handleAcceptRefinement` to handle the updated schedule format with start/end dates.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/review-challenge-sections/index.ts` | Batch-split logic, master data fetching, inject options into prompt |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Accept `masterDataOptions` param, inject into per-section prompt, update schedule_table instruction |
| `src/components/cogniblend/curation/renderers/ScheduleTableSectionRenderer.tsx` | Rewrite with 4 columns + edit support |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Phase schedule edit handler |

