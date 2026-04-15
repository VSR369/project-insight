

# Fix: Enable Context Intelligence + Add Missing Section Configs + Set Critical Model

## What's Already Working (Confirmed)

The wave architecture restoration from the previous implementation is **correctly wired**:
- `useCurationAIActions.ts` calls `executeWavesPass1()` and `executeWavesPass2()` — correct
- `useWaveExecutor.ts` processes 6 waves with `MAX_BATCH_SIZE=6` batching — correct
- `useWaveReviewSection.ts` handles `pass1Only` and `skipAnalysis` flags — correct
- `review-challenge-sections` (974 lines) has all prompt engineering intact — correct
- `waveConfig.ts` has all 33 sections across 6 waves — correct
- `bulkAcceptHelpers.ts` has empty `BULK_SKIP_SECTIONS` — correct
- Deleted edge functions (`analyse-challenge`, `generate-suggestions`, `curation-intelligence`) are gone — correct
- `AnalyseProgressPanel` is removed, `WaveProgressPanel` is active — correct
- JSZip uses default import (`import JSZip from "..."`) — correct
- Context digest code exists in `review-challenge-sections` lines 580-614 — correct

## What's Broken (Root Causes Found)

### 1. Context Digest is DEAD — `use_context_intelligence = false`

**DB evidence:** `ai_review_global_config` has `use_context_intelligence: false`

This means line 583 of `review-challenge-sections`:
```typescript
if (resolvedContext === "curation" && useContextIntelligence) {
```
...NEVER executes. The digest from "Discover Sources" is fetched, stored in `challenge_context_digest`, but **never read by the AI during Pass 2**. All the discovery/extraction work is wasted.

**Fix:** SQL migration to set `use_context_intelligence = true` and `critical_model = 'google/gemini-3-flash-preview'`.

### 2. Six sections have NO config rows — get GENERIC review instructions

**Missing from `ai_review_section_config`:**
- `organization_context` — new section, no config
- `creator_references` — in waves, no config
- `reference_urls` — in waves, no config  
- `evaluation_config` — in waves, no config
- `solver_audience` — in waves, no config
- `creator_legal_instructions` — new section, no config

These sections fall back to the hardcoded `CURATION_SECTIONS` descriptions (which exist and work), but they get NO specific `review_instructions`, `dos`, `donts`, `importance_level`, or `min_words` guidance. The AI treats them generically.

**Fix:** SQL migration to insert 6 config rows with rich, section-specific review instructions.

### 3. Legacy config rows exist for deprecated keys

Three config rows exist for keys not in any wave: `challenge_visibility`, `effort_level`, `submission_deadline`. These are harmless but wasteful.

**Fix:** Delete them in the same migration (cleanup).

## Changes

### Migration: Enable context intelligence + add 6 missing configs

Single SQL migration that:

1. **Updates `ai_review_global_config`**: Sets `use_context_intelligence = true` and `critical_model = 'google/gemini-3-flash-preview'`

2. **Inserts 6 missing section configs** with rich review instructions:
   - `organization_context`: Review org profile completeness for solver context
   - `creator_references`: Verify attachments are relevant, accessible, properly scoped
   - `reference_urls`: Verify URLs are active, relevant, not paywalled
   - `evaluation_config`: Verify SINGLE vs DELPHI aligns with complexity/eligibility
   - `solver_audience`: Verify Internal/External/All aligns with operating model
   - `creator_legal_instructions`: Review legal instructions for clarity and IP alignment

3. **Deletes 3 deprecated config rows**: `challenge_visibility`, `effort_level`, `submission_deadline`

### No code changes needed

All code paths are already correctly implemented. The only issue is database configuration.

## Expected Result After Migration

- Pass 2 will read the context digest from `challenge_context_digest` and inject it into every AI prompt
- All 33 sections get rich, specific review instructions (not generic fallbacks)
- Critical sections (`problem_statement`, `deliverables`, etc.) route to `critical_model`
- Discovery → Extraction → Digest → Pass 2 pipeline is fully connected end-to-end

## Technical Details

```text
Before:  Discovery → Digest stored → Pass 2 IGNORES digest (flag=false)
After:   Discovery → Digest stored → Pass 2 READS digest (flag=true) → grounded suggestions
```

Total sections with config: 30 (existing) + 6 (new) - 3 (deleted) = 33 config rows

