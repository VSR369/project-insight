

# Phase 6 Remaining Work: Gap Analysis + Continuation Plan

## Identified Gaps in Steps 1-5

### Gap 1: Bug in edge function — `activeConfigs` undefined
In `supabase/functions/review-challenge-sections/index.ts` line 701, `buildSmartBatchPrompt(activeConfigs, ...)` references `activeConfigs` which is never declared. It should be the batch-filtered configs from `dbConfigMap`. This will cause a runtime error on every AI review call.

### Gap 2: `assemblePrompt.ts` task marked todo but already implemented
Roadmap task `d0b155d2` ("Create assemblePrompt utility") is still `todo` but the file exists at `src/lib/cogniblend/assemblePrompt.ts` — needs status update to `done`.

### Gap 3: `phase_templates` table migration task still `todo`
Roadmap task `dc2a3be0` ("Create phase_templates table migration") is `todo` but the table was created in the migration. Needs `done`.

### Gap 4: Edge function not re-deployed after the `activeConfigs` bug
The edge function was deployed with the bug. Needs fix + redeploy.

## Implementation Plan

### Task 1: Fix edge function `activeConfigs` bug + redeploy

**File:** `supabase/functions/review-challenge-sections/index.ts` line 701

Replace `activeConfigs` with batch-scoped configs from `dbConfigMap`:
```typescript
const batchConfigs = batch.map(b => dbConfigMap!.get(b.key)!).filter(Boolean);
systemPrompt = buildSmartBatchPrompt(batchConfigs, resolvedContext, masterDataOptions, clientContext, challengeData);
```

Redeploy the edge function.

### Task 2: Seed 24 section prompt configs

Use the Supabase insert tool to UPDATE existing `ai_review_section_config` rows (role_context='curation') with the structured JSONB data from the Phase 6 spec. For each of the 24 sections:

- `platform_preamble`: Shared consulting-grade preamble (same for all)
- `quality_criteria`: Section-specific criteria with severity and cross-references
- `cross_references`: Section keys this section depends on (from `DIRECT_DEPENDENCIES`)
- `master_data_constraints`: For master-data-bound sections (maturity_level, complexity, eligibility, ip_model, visibility, domain_tags)
- `content_templates`: Per-maturity templates (blueprint, poc, pilot) where specified
- `computation_rules`: For computed sections (phase_schedule, evaluation_criteria, reward_structure)
- `web_search_queries`: Research directives
- `industry_frameworks`: Reference frameworks
- `wave_number`: From EXECUTION_WAVES config
- `tab_group`: Problem Definition, Challenge Context, Scope & Complexity, Solvers & Schedule, Evaluation & Rewards, Publish & Discover

All 24 section keys from SECTION_FORMAT_CONFIG: problem_statement, scope, deliverables, expected_outcomes, submission_guidelines, maturity_level, evaluation_criteria, reward_structure, complexity, ip_model, legal_docs, escrow_funding, eligibility, visibility, domain_tags, phase_schedule, context_and_background, root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest, hook, solver_expertise.

### Task 3: Seed 12 phase templates

Insert 12 rows into `phase_templates` table for:
- 4 solution types: strategy_design, technology_architecture, process_operations, product_innovation
- 3 maturity levels: blueprint, poc, pilot

Each with phase structures (name, minDays, maxDays) and total duration ranges from the Phase 6 spec. For the 10 combinations not explicitly specified, derive reasonable defaults from the 2 given examples.

### Task 4: Enhance AIReviewConfigPage with structured editing tabs

Extend the existing `SectionEditor` component in `AIReviewConfigPage.tsx` to add tabbed editing for the new structured fields:

1. **Instructions tab** (existing) — review_instructions, dos, donts, tone, word counts
2. **Quality Criteria tab** — CRUD list; each criterion: name, description, severity dropdown (error/warning/suggestion), cross-reference multi-select (picks from other section keys)
3. **Constraints & Templates tab** — master data constraints table, computation rules list, content templates textarea per maturity level
4. **Research tab** — web search queries (purpose + template + when), industry frameworks tag input, analyst sources tag input
5. **Preview & Test tab** — shows fully assembled 5-layer prompt using `assemblePrompt()`, token count estimate, test button that invokes edge function

The save handler already exists — extend it to also persist the new JSONB columns.

### Task 5: Wire useWaveExecutor to pass prompt configs

Modify `useWaveExecutor.ts` to:
- Import and use `useExtendedSectionConfigs` to load configs
- Pass matched config data to the edge function call via the existing `context` body parameter
- The edge function already reads `clientContext` — just ensure configs are available for `buildSmartBatchPrompt`

This step may be minimal since the edge function already loads configs from DB directly (line 500-506). The wave executor already passes `context` which the edge function uses. The main value is ensuring the `cross_references` field drives which section content gets injected into the prompt.

## Execution Order

1. Fix `activeConfigs` bug + redeploy edge function (critical — current reviews are broken)
2. Seed 24 section configs (unblocks structured prompt assembly)
3. Seed 12 phase templates (reference data for phase schedule)
4. Enhance AIReviewConfigPage UI (admin can manage structured fields)
5. Wire useWaveExecutor (minimal — verify config flow)
6. Update roadmap task statuses

## Technical Details

- Seeding uses Supabase insert tool with UPDATE statements (not migrations)
- UI uses existing Tabs component from `@/components/ui/tabs`
- Quality criteria CRUD uses inline editing pattern consistent with existing admin pages
- Preview tab reuses `assemblePrompt()` from `src/lib/cogniblend/assemblePrompt.ts`
- Test tab calls `supabase.functions.invoke('review-challenge-sections', ...)` with a mock/real challenge
- All new fields are nullable with defaults, so backward compatibility is maintained

