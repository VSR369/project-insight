

# Prompt 12 — Quality Telemetry Dashboard

## Goal
Capture AI review quality metrics into `challenge_quality_telemetry` after each review run, and build a supervisor dashboard to visualize trends.

## What exists
- **Table**: `challenge_quality_telemetry` with columns: `challenge_id`, `sections_reviewed`, `pass1_tokens`, `pass2_tokens`, `consistency_findings_count`, `ambiguity_findings_count`, `total_corrections`, `avg_edit_magnitude`, `model_used`, `review_duration_seconds`, `is_baseline`, `created_at`
- **Edge function**: `review-challenge-sections/index.ts` logs token usage to console but does NOT write to the telemetry table
- **Route pattern**: `/admin/seeker-config/ai-quality/...` with `supervisor.configure_system` permission guard

## Changes

### 1. Edge function: Write telemetry row after review completion
**File**: `supabase/functions/review-challenge-sections/index.ts`

After the final persist of `ai_section_reviews` (line ~1088), insert a row into `challenge_quality_telemetry`:
- Accumulate `pass1_tokens` and `pass2_tokens` from batch results (track totals across batches)
- Count `consistency_findings_count` and `ambiguity_findings_count` from the post-batch passes
- `sections_reviewed` = number of sections processed
- `model_used` = primary model from config
- `review_duration_seconds` = `Date.now() - startTime` (add `startTime` at top of handler)
- `total_corrections` and `avg_edit_magnitude` default to 0 (populated later by curator edits)
- Skip telemetry insert in preview mode
- Non-blocking: catch and log errors without failing the review

### 2. Query hook: `useQualityTelemetry`
**File**: `src/hooks/queries/useQualityTelemetry.ts`

- Fetch from `challenge_quality_telemetry` ordered by `created_at DESC`, limit 200
- Compute summary stats: avg tokens per review, avg duration, total reviews, avg findings counts
- Support date range filter (optional)

### 3. Dashboard page: `QualityTelemetryPage`
**File**: `src/pages/admin/QualityTelemetryPage.tsx`

Following the `SupervisorLearningPage` pattern:
- **Stats cards** (4): Total reviews, avg duration, avg tokens (pass1+pass2), avg findings (consistency + ambiguity)
- **Telemetry table**: Date, challenge ID (truncated), sections reviewed, pass1/pass2 tokens, consistency/ambiguity findings, duration, model

### 4. Stats component
**File**: `src/components/admin/telemetry/TelemetryStats.tsx`

4 summary cards mirroring `LearningCorpusStats` pattern.

### 5. Table component
**File**: `src/components/admin/telemetry/TelemetryTable.tsx`

Sortable table with the telemetry columns.

### 6. Route wiring
**File**: `src/App.tsx`

Add route at `ai-quality/telemetry` with `supervisor.configure_system` guard.

## Technical notes
- Token tracking requires accumulating usage across batch iterations in `index.ts` — will add counter variables at the batch loop level
- All new UI files under 250 lines
- No database migration needed — table already exists

