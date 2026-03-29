

# Phase 6 — Clarified: ONE Table, Enriched Columns

## What stays (already useful, already driving prompts)

The existing `ai_review_section_config` fields — `review_instructions`, `dos`, `donts`, `example_good`, `example_poor`, `tone`, `min_words`, `max_words`, `required_elements`, `importance_level`, `section_description` — all remain. They are the supervisor's primary editing surface and already compose into the LLM prompt via `buildConfiguredBatchPrompt()`.

## What gets added (same table, new JSONB columns)

These columns add **structure** to what is currently unstructured or hardcoded:

| New column | Type | Purpose | Currently lives... |
|-----------|------|---------|-------------------|
| `quality_criteria` | JSONB | Named checks with severity + cross-section refs (e.g., "MATURITY-DURATION MATCH", error, cross-check with `maturity_level`) | Buried in free-text `review_instructions` — AI often misses them |
| `cross_references` | JSONB | Section keys whose content gets injected into this section's prompt | Hardcoded in `sectionDependencies.ts` — not supervisor-configurable |
| `master_data_constraints` | JSONB | Which fields must come from which lookup table, strict or soft | Hardcoded in `promptTemplate.ts` |
| `content_templates` | JSONB | Per-maturity output templates (blueprint / POC / pilot) | Doesn't exist — AI has no maturity-specific guidance |
| `computation_rules` | JSONB | Programmatic rules like "weights sum to 100%" | Hardcoded in `postLlmValidation.ts` |
| `web_search_queries` | JSONB | Research directives for generation | Doesn't exist |
| `industry_frameworks` | JSONB | Reference frameworks (TOGAF, SAFe, etc.) | Doesn't exist |
| `platform_preamble` | TEXT | Consulting-grade persona (shared across all sections) | Currently a generic one-liner |
| `wave_number` | INT | Which wave this section belongs to | Hardcoded in `waveConfig.ts` |
| `supervisor_examples` | JSONB | Structured good/bad examples with explanations | Currently flat text `example_good`/`example_poor` (stays for backward compat) |

## How the prompt assembles (single flow)

```text
ai_review_section_config row (ALL fields)
    │
    ├── platform_preamble        → Layer 1: Persona + anti-hallucination rules
    ├── section_description      → Layer 2: Role
    ├── quality_criteria         → Layer 2: Structured checklist
    ├── master_data_constraints  → Layer 2: Valid value injection
    ├── content_templates        → Layer 2: Maturity-specific template
    ├── computation_rules        → Layer 2: Programmatic rules
    ├── web_search_queries       → Layer 3: Research directives
    ├── industry_frameworks      → Layer 3: Framework references
    ├── review_instructions      → Layer 4: Supervisor free-text (existing)
    ├── dos / donts              → Layer 4: Supervisor guardrails (existing)
    ├── example_good/poor        → Layer 4: Supervisor examples (existing)
    ├── supervisor_examples      → Layer 4: Structured examples (new)
    └── ChallengeContext         → Layer 5: Runtime (todaysDate, rateCard, sections)
            │
            └── cross_references → Injects dependent section content into prompt
```

One table. One `assemblePrompt()` function. One edge function. The supervisor sees all fields in one admin page.

## Implementation steps

### Step 1: Migration — add columns to `ai_review_section_config`
Add the JSONB/TEXT/INT columns listed above. All nullable with sensible defaults so existing rows work unchanged.

### Step 2: Migration — create `phase_templates` table
New table for 12 solution-type x maturity phase duration ranges. This is genuinely new reference data.

### Step 3: Seed 24 section configs with structured data
UPDATE existing rows to populate the new columns with quality criteria, cross-references, constraints, and templates from the Phase 6 spec.

### Step 4: `assemblePrompt()` utility
New file: `src/lib/cogniblend/assemblePrompt.ts`. Reads ALL fields from the config row (old + new). Composes the 5-layer prompt. Injects cross-referenced section content from `ChallengeContext`.

### Step 5: Edge function — replace `buildConfiguredBatchPrompt` with `assemblePrompt`
When the new JSONB fields are populated, use structured assembly. When they're empty, fall back to existing flat-text assembly. Backward compatible.

### Step 6: Wire wave executor
Load configs, pass to edge function. Each wave call uses `assemblePrompt` with fresh context.

### Step 7: Enhance admin UI
Add tabs to the existing `AIReviewConfigPage` edit dialog: Quality Criteria CRUD, Constraints & Templates, Research, Preview & Test. Supervisor edits everything in one place.

## Files to create
- `src/lib/cogniblend/assemblePrompt.ts`
- `src/hooks/queries/usePromptConfig.ts`

## Files to modify
- `supabase/functions/review-challenge-sections/promptTemplate.ts` (add `assemblePrompt` for Deno)
- `supabase/functions/review-challenge-sections/index.ts` (use new assembly when available)
- `src/hooks/useWaveExecutor.ts` (pass config)
- `src/pages/admin/seeker-config/AIReviewConfigPage.tsx` (add structured editing tabs)

## No second table. No confusion.

