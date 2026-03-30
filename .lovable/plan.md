

# Comprehensive AI Review Pipeline Enhancement — 6 Changes in Dependency Order

## Current State Summary

The two-pass architecture (Pass 1 = analyze, Pass 2 = rewrite) is already implemented in `index.ts`. However, Pass 2 uses a static `PASS2_SYSTEM_PROMPT` constant (lines 376-392) with no access to section configs, quality criteria, content templates, frameworks, or cross-references. The edge function loads `dbConfigs` (line 819) and `globalConfig` (line 820) but only passes them to Pass 1 via `buildSmartBatchPrompt`. Pass 2 receives raw `challengeData` and `clientContext` only. No `promptConfigValidator` exists. No `cleanAIOutput` function exists. No `skip_analysis` support exists. The `handleRefineWithAI` in `AIReviewInline.tsx` (line 510-559) still calls the separate `refine-challenge-section` edge function.

---

## Phase 1: Diagnostics + Intelligence (Changes 5 & 6)

### Change 5: Prompt Config Validator + Health Dashboard

**New file: `src/utils/promptConfigValidator.ts`**
- Export `ConfigScore` interface with `sectionKey`, `importance`, `reviewReadiness` (0-100), `generationReadiness` (0-100), `issues[]`, `missing[]`
- Export `scorePromptConfig(config)` function scoring across 5 layers:
  - L1 Preamble (10pts), L2 Quality Criteria (20pts) + Cross-refs (10pts), L3 Web Search (10pts) + Frameworks (5pts), L4 Instructions+Examples (20pts), L5 Runtime (10pts assumed)
  - Generation bonus: content templates across 3 maturity levels (+20pts)
- Export `scoreAllConfigs(configs[])` returning aggregate stats

**Modified file: `src/pages/admin/seeker-config/AIReviewConfigPage.tsx`**
- Import `scorePromptConfig` from the new validator
- Add a "Config Health" `Card` between Global Settings and the Section Accordion
- Show average review/generation readiness with progress bars
- List sections below 70% with their specific `issues` and `missing` items
- Color-coded: green >= 80, yellow 60-79, red < 60

### Change 5b: Content Templates for 4 Generation-Critical Sections

**Data inserts** (via insert tool) into `ai_review_section_config.content_templates` for:
- `success_metrics_kpis`: Blueprint (strategic value metrics), POC (technical feasibility metrics), Pilot (business impact metrics)
- `root_causes`: All maturities (5-Whys framework, phrase labels, categorize by Process/Technology/Organizational/Data)
- `current_deficiencies`: All maturities (factual observations, `[System/Process] lacks/fails/cannot [capability]` format)
- `affected_stakeholders`: All maturities (4-6 entries with Name/Role/Impact/Adoption Challenge, include Primary/Secondary/Tertiary)

### Change 6: Intelligence Directive for Pass 1

**Modified file: `supabase/functions/review-challenge-sections/promptTemplate.ts`**
- In `buildStructuredBatchPrompt`, add an `intelligenceDirective` block after Layer 1 preamble and before the OUTPUT FORMAT section (~line 191)
- Content: instructs the LLM to actively USE domain expertise (MTBF/MTTR for supply chain, NIST CSF for cybersecurity, etc.), cite industry benchmarks, warn about domain-specific pitfalls, and APPLY frameworks rather than just naming them
- Includes guardrails: never invent specific numbers/costs/system names, never fabricate quotes, domain knowledge adds context not insider specifics

---

## Phase 2: Pass 2 Enrichment (Change 1)

### Change 1: Enrich Pass 2 with Section-Specific Config

**Modified file: `supabase/functions/review-challenge-sections/promptTemplate.ts`**
- Export new `buildPass2SystemPrompt(sectionConfigs: SectionConfig[], challengeContext: any): string`
- Builds a section-aware system prompt including:
  - Base rewrite rules + intelligence directive (same consulting-grade persona)
  - Challenge context (maturity, solution type, seeker segment, complexity, today's date)
  - Per-section enrichment: content template for active maturity, quality criteria definitions, industry frameworks, analyst sources, good example, supervisor DOs
  - Cross-referenced section content (capped at 2000 chars per ref for token management)

**Modified file: `supabase/functions/review-challenge-sections/index.ts`**
- Import `buildPass2SystemPrompt` from `promptTemplate.ts`
- Update `callAIPass2Rewrite` signature to accept `sectionConfigs: SectionConfig[]`
- Replace `PASS2_SYSTEM_PROMPT` constant usage (line 473) with `buildPass2SystemPrompt(sectionConfigs, clientContext)`
- Update `callAIBatchTwoPass` to accept and pass through `dbConfigs`
- At the call site (~line 1076), pass `dbConfigs` (already available as `dbConfigMap`) to `callAIBatchTwoPass`, which extracts matching configs for sections needing rewrite

---

## Phase 3: Model Selection + Output Cleaning (Changes 2 & 4)

### Change 2: Model Selection Per Section Importance

**Database migration:**
```sql
ALTER TABLE ai_review_global_config ADD COLUMN IF NOT EXISTS critical_model TEXT;
```

**Modified file: `supabase/functions/review-challenge-sections/index.ts`**
- Add `CRITICAL_SECTIONS` set: `problem_statement`, `deliverables`, `evaluation_criteria`, `phase_schedule`, `complexity`, `reward_structure`
- Add `getModelForRequest(sectionKeys: string[], globalConfig: any): string` that checks if any key is in `CRITICAL_SECTIONS` and returns `globalConfig.critical_model` when set, else `globalConfig.default_model`
- Replace `modelToUse` (line 821) usage in `callAIBatchTwoPass` and `callComplexityAI` with `getModelForRequest()`

**Modified file: `src/pages/admin/seeker-config/AIReviewConfigPage.tsx`**
- Add "Critical Model" input field next to "Default AI Model" in Global Settings card
- Persist `critical_model` alongside `default_model` in `handleSaveGlobal`
- Load from `globalConfig.critical_model` via `useEffect`

### Change 4: Fix Literal `\n` in AI Output

**Modified file: `supabase/functions/review-challenge-sections/index.ts`**
- Add `cleanAIOutput(text: string | null | undefined): string | null` utility:
  - Replace literal `\\n` with actual newline
  - Replace literal `\\t` with actual tab
  - Fix double-escaped backslashes and quotes
  - Trim whitespace
- Apply to all output fields in the merge step of `callAIBatchTwoPass` (after Pass 1 + Pass 2 merge):
  - Clean `suggestion`, comment `text`, comment `reasoning`, and `guidelines` strings
- Also add clean-output instruction to Pass 2 system prompt (in Change 1's `buildPass2SystemPrompt`)

---

## Phase 4: Skip-Analysis Re-Refine (Change 3)

### Change 3: Manual Re-Refine via Pass 2 Only

**Modified file: `supabase/functions/review-challenge-sections/index.ts`**
- At request parsing (~line 788), extract two new optional fields: `skip_analysis` (boolean) and `provided_comments` (array)
- In the batch processing loop, when `skip_analysis === true`:
  - Skip Pass 1 entirely
  - Use `provided_comments` as Pass 1 results directly
  - Run only Pass 2 with the provided comments (using enriched `buildPass2SystemPrompt`)
  - Return merged results in the same response shape

**Modified file: `src/components/cogniblend/shared/AIReviewInline.tsx`**
- Update `handleRefineWithAI` (~line 510) to call `review-challenge-sections` instead of `refine-challenge-section`:
  - Send `skip_analysis: true`
  - Send `provided_comments` array with the curator-edited comment objects, status, and existing guidelines
  - Extract suggestion from response `data.data.sections[0].suggestion`
  - Set as `refinedContent` for the existing accept/reject flow
- The old `refine-challenge-section` endpoint remains for backward compatibility but new flows bypass it

---

## Implementation Order

```text
Change 5  ──→  Change 6  ──→  Change 1  ──→  Change 2 + Change 4  ──→  Change 3
validator      intelligence    enrich P2      model sel + cleaning      re-refine
(frontend)     (edge fn)       (edge fn)      (edge fn + frontend)      (edge fn + frontend)
```

Changes 2 and 4 are parallel (independent). Change 3 depends on Change 1 (needs enriched Pass 2).

## Files Changed Summary

| File | Changes |
|---|---|
| `src/utils/promptConfigValidator.ts` | New — config scoring utility |
| `src/pages/admin/seeker-config/AIReviewConfigPage.tsx` | Config Health dashboard card + critical model field |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Intelligence directive (Change 6) + `buildPass2SystemPrompt` export (Change 1) |
| `supabase/functions/review-challenge-sections/index.ts` | Pass 2 enrichment, model selection, `cleanAIOutput`, `skip_analysis` support |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Re-refine via `skip_analysis` instead of separate edge function |

**Migration:** `ALTER TABLE ai_review_global_config ADD COLUMN IF NOT EXISTS critical_model TEXT;`

**Data inserts:** Content templates for 4 sections via insert tool

