

# Implementation Status: AI Review Pipeline — 6 Changes

## Audit Results

After searching the entire codebase, here is the status of each change:

| Change | Status | Evidence |
|---|---|---|
| **Change 1**: Enrich Pass 2 with section-specific config | **NOT IMPLEMENTED** | `buildPass2SystemPrompt` does not exist. Pass 2 still uses static `PASS2_SYSTEM_PROMPT` constant (line 376 of index.ts). No section configs, quality criteria, content templates, frameworks, or cross-references are passed to Pass 2. |
| **Change 2**: Model selection per section importance | **PARTIALLY IMPLEMENTED** | `critical_model` field exists in the `AIReviewConfigPage.tsx` UI (line 88) and is persisted to `ai_review_global_config`. But `getModelForRequest()` does NOT exist in the edge function — `modelToUse` (line 821) still uses only `default_model`. No routing logic exists. |
| **Change 3**: Manual re-refine (skip_analysis) | **NOT IMPLEMENTED** | `skip_analysis` and `provided_comments` are not parsed from the request (line 788). `handleRefineWithAI` in `AIReviewInline.tsx` (line 526) still calls the separate `refine-challenge-section` edge function. |
| **Change 4**: Fix literal `\n` in AI output | **NOT IMPLEMENTED** | `cleanAIOutput` function does not exist anywhere. No sanitization applied to Pass 1 or Pass 2 outputs. |
| **Change 5**: Prompt config validator + health dashboard | **PARTIALLY IMPLEMENTED** | `src/utils/promptConfigValidator.ts` exists with `scorePromptConfig` and `scoreAllConfigs`. But the Config Health dashboard card is NOT rendered in `AIReviewConfigPage.tsx` (no import of the validator). Content template data inserts for the 4 sections have not been verified. |
| **Change 6**: Intelligence directive for Pass 1 | **NOT IMPLEMENTED** | No `intelligenceDirective` block exists in `promptTemplate.ts`. The `buildStructuredBatchPrompt` function goes straight from Layer 1 preamble to OUTPUT FORMAT (line 191). |

## What Exists (Validator File)

`src/utils/promptConfigValidator.ts` is created with correct scoring logic but uses `platform_preamble` length check instead of `has_preamble` boolean. The scoring weights roughly align with the spec.

## Implementation Plan — 6 Changes in Dependency Order

### Phase 1: Diagnostics + Intelligence (Changes 5 & 6)

**Change 5a: Config Health Dashboard in AIReviewConfigPage**

File: `src/pages/admin/seeker-config/AIReviewConfigPage.tsx`
- Import `scorePromptConfig`, `scoreAllConfigs` from `@/utils/promptConfigValidator`
- Import `useExtendedSectionConfigs` from `@/hooks/queries/usePromptConfig`
- Add a "Config Health" Card between the Global Settings card and the Section Accordion
- Show average review/generation readiness with `Progress` bars
- List sections below 70% with color-coded badges (green ≥80, yellow 60-79, red <60)
- Show specific `issues[]` and `missing[]` per flagged section

**Change 5b: Content Template Data Inserts**

Insert content templates into `ai_review_section_config.content_templates` for:
- `success_metrics_kpis`: Blueprint/POC/Pilot templates
- `root_causes`: All maturities (5-Whys framework)
- `current_deficiencies`: All maturities (factual observation format)
- `affected_stakeholders`: All maturities (stakeholder table format)

**Change 6: Intelligence Directive for Pass 1**

File: `supabase/functions/review-challenge-sections/promptTemplate.ts`
- In `buildStructuredBatchPrompt`, insert an `intelligenceDirective` block after line 189 (Layer 1 preamble) and before line 191 (OUTPUT FORMAT)
- Content instructs the LLM to apply domain expertise (MTBF/MTTR for supply chain, NIST CSF for cybersecurity), cite benchmarks, warn about pitfalls, apply frameworks not just name them
- Include guardrails: never invent numbers/costs/system names, never fabricate quotes

### Phase 2: Pass 2 Enrichment (Change 1)

**File: `supabase/functions/review-challenge-sections/promptTemplate.ts`**
- Export new `buildPass2SystemPrompt(sectionConfigs: SectionConfig[], challengeContext: any): string`
- Builds section-aware system prompt with:
  - Base rewrite rules + intelligence directive
  - Challenge context (maturity, solution type, seeker segment, complexity, today's date)
  - Per-section: content template for active maturity, quality criteria, frameworks, analyst sources, good example, supervisor DOs
  - Cross-referenced section content (capped at 2000 chars per ref)

**File: `supabase/functions/review-challenge-sections/index.ts`**
- Import `buildPass2SystemPrompt` from promptTemplate.ts
- Update `callAIPass2Rewrite` signature: add `sectionConfigs: SectionConfig[]` parameter
- Replace `PASS2_SYSTEM_PROMPT` (line 473) with `buildPass2SystemPrompt(pass2Configs, clientContext)`
- Update `callAIBatchTwoPass` to accept and pass `dbConfigs`
- At call site (~line 1076), pass `dbConfigMap` entries to `callAIBatchTwoPass`

### Phase 3: Model Selection + Output Cleaning (Changes 2 & 4)

**Change 2: Model Selection**

Database migration:
```sql
ALTER TABLE ai_review_global_config ADD COLUMN IF NOT EXISTS critical_model TEXT;
```

File: `supabase/functions/review-challenge-sections/index.ts`
- Add `CRITICAL_SECTIONS` set: `problem_statement`, `deliverables`, `evaluation_criteria`, `phase_schedule`, `complexity`, `reward_structure`
- Add `getModelForRequest(sectionKeys, globalConfig)` — returns `globalConfig.critical_model` if any key is critical and value is set, else `default_model`
- Replace `modelToUse` at line 821 with `getModelForRequest()` for both Pass 1 and Pass 2

File: `src/pages/admin/seeker-config/AIReviewConfigPage.tsx`
- The Critical Model input already exists — verify it renders and persists correctly

**Change 4: Clean AI Output**

File: `supabase/functions/review-challenge-sections/index.ts`
- Add `cleanAIOutput(text)` utility after imports
- Apply in the MERGE step of `callAIBatchTwoPass` (after line 586): clean `suggestion`, comment `text`, comment `reasoning`, and `guidelines` strings
- Add clean-output instruction to Pass 2 system prompt (already included in Change 1's `buildPass2SystemPrompt`)

### Phase 4: Skip-Analysis Re-Refine (Change 3)

File: `supabase/functions/review-challenge-sections/index.ts`
- At request parsing (line 788), extract `skip_analysis` and `provided_comments`
- When `skip_analysis === true`: skip Pass 1, use `provided_comments` as Pass 1 results, run only Pass 2
- Return merged results in same response shape

File: `src/components/cogniblend/shared/AIReviewInline.tsx`
- Update `handleRefineWithAI` (line 510-559) to call `review-challenge-sections` with `skip_analysis: true` instead of `refine-challenge-section`
- Send `provided_comments` array with curator-edited comments
- Extract suggestion from response and set as `refinedContent`

## Files Changed Summary

| File | Changes |
|---|---|
| `src/utils/promptConfigValidator.ts` | Already exists — no changes needed |
| `src/pages/admin/seeker-config/AIReviewConfigPage.tsx` | Add Config Health dashboard card (Change 5a) |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Intelligence directive (Change 6) + `buildPass2SystemPrompt` export (Change 1) |
| `supabase/functions/review-challenge-sections/index.ts` | Pass 2 enrichment wiring, `getModelForRequest`, `cleanAIOutput`, `skip_analysis` support |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Re-refine via `skip_analysis` (Change 3) |

**Migration:** `ALTER TABLE ai_review_global_config ADD COLUMN IF NOT EXISTS critical_model TEXT;`
**Data inserts:** Content templates for 4 sections

