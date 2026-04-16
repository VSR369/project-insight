

# Prompt 13 — Curator Learning Loop Hardening & Self-Critique

## Goal
Close highest-priority gaps in the curator learning system: hard-constraint injection, activation thresholds, correction classification, token budgeting, self-critique block, and legacy builder cleanup.

## What was implemented

### 1. Database schema — `section_example_library` columns
- `correction_class TEXT` — classifies corrections (factual/style/structural/terminology/quantification/framework/omission)
- `activation_confidence NUMERIC DEFAULT 0.5` — tracks confidence for activation gating
- `distinct_curator_count INTEGER DEFAULT 1` — tracks distinct curator contributions
- Partial index on `(is_active, activation_confidence) WHERE learning_rule IS NOT NULL AND activation_confidence >= 0.7`

### 2. `extract-correction-patterns` edge function
- Added correction_class to AI extraction prompt with class definitions
- Semantic deduplication: before inserting, checks existing rules with substring similarity (>50% word overlap)
- When similar rule found: increments activation_confidence by 0.15, tracks distinct curators
- Auto-activates when confidence ≥ 0.7 AND distinct_curator_count ≥ 2
- New examples start dormant (is_active = false) until activation threshold met

### 3. `fetchExamples.ts` — hard corrections + token budgeting
- `fetchHardCorrections(adminClient, sectionKeys)`: queries active, high-confidence learned rules
- `formatCorrectionsForPrompt(corrections, charBudget)`: formats as `CURATOR-LEARNED CORRECTIONS` block
- `formatExamplesForPrompt()` now has token budgeting (TOKEN_BUDGET_CHARS = 24000, split 50/50 between corrections and examples)
- Logs when truncation occurs

### 4. System prompt injection
- Hard corrections injected BEFORE dynamic examples in Pass 1 system prompt
- Hard corrections passed through to Pass 2 via `buildPass2SystemPrompt` (new `correctionsBlock` parameter)
- Corrections flow through `clientContext._correctionsBlock` to avoid changing multiple function signatures

### 5. Self-critique block
- `PRINCIPAL_SELF_CRITIQUE` constant appended to `buildStructuredBatchPrompt` after the Strategic Coherence Check
- Asks 4 questions of each comment before returning

### 6. Legacy cleanup
- `buildConfiguredBatchPrompt` deleted from `promptBuilders.ts`
- Export removed from `promptTemplate.ts`

## Files modified
| File | Change |
|---|---|
| Migration | Added correction_class, activation_confidence, distinct_curator_count to section_example_library |
| `supabase/functions/extract-correction-patterns/index.ts` | Full rewrite — classification, dedup, activation logic |
| `supabase/functions/review-challenge-sections/fetchExamples.ts` | Added fetchHardCorrections, formatCorrectionsForPrompt, token budgeting |
| `supabase/functions/review-challenge-sections/promptBuilders.ts` | Added self-critique, deleted buildConfiguredBatchPrompt |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Removed buildConfiguredBatchPrompt export |
| `supabase/functions/review-challenge-sections/index.ts` | Wired fetchHardCorrections + formatCorrectionsForPrompt injection |
| `supabase/functions/review-challenge-sections/pass2Prompt.ts` | Added correctionsBlock parameter |
| `supabase/functions/review-challenge-sections/aiPass2.ts` | Passes correctionsBlock to buildPass2SystemPrompt |
