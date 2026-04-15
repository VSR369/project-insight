

# Restore Wave Architecture for Maximum Quality AI Reviews

## Current Problem

Two competing AI architectures exist in the codebase:
- **Wave-based** (old): 6 dependency-ordered waves, one AI call per section via `review-challenge-sections`. Fully functional, high quality, covers all 31 sections.
- **Unified** (new): ONE AI call for all sections via `analyse-challenge` + `generate-suggestions`. Returns only 7-10 sections due to token truncation.

The Analyse and Generate buttons currently call the unified path, which silently skips 20+ sections. The wave executor infrastructure is fully intact but unused by the main flow.

## Design Decision

**Maximum quality**: Restore wave-based execution as the exclusive path. One focused AI call per section ensures zero truncation and deep, contextual analysis for every section across all tabs.

## End-to-End Flow After Fix

```text
┌─────────────────────────────────────────────────────────┐
│  ANALYSE BUTTON                                         │
│  1. Pre-flight check                                    │
│  2. Clear all previous state                            │
│  3. Pass 1 waves (6 waves × ~5 sections each)           │
│     → review-challenge-sections per section              │
│     → pass1_only=true (comments only, no suggestions)    │
│     → WaveProgressPanel shows real-time wave progress    │
│  4. Discovery: discover-context-resources                │
│  5. Extraction: extract-attachment-text (auto-accepted)  │
│  6. Open Context Library for curator review              │
│  7. pass1DoneSession = true                              │
├─────────────────────────────────────────────────────────┤
│  GENERATE SUGGESTIONS BUTTON                            │
│  1. Generate context digest                              │
│  2. Pass 2 waves (6 waves × ~5 sections each)           │
│     → review-challenge-sections per section              │
│     → skipAnalysis=true, uses Pass 1 comments            │
│     → Generates format-correct suggestions               │
│     → WaveProgressPanel shows real-time wave progress    │
│  3. generateDoneSession = true                           │
│  4. Accept All shows count of ALL sections with suggestions│
├─────────────────────────────────────────────────────────┤
│  ACCEPT ALL SUGGESTIONS                                 │
│  1. Partitions ALL sections (including legal, escrow)    │
│  2. Sequential save for regular + batched extended_brief │
│  3. Marks addressed=true, collapses all panels           │
│  4. Navigates to preview                                 │
└─────────────────────────────────────────────────────────┘
```

## Changes

### 1. `src/hooks/cogniblend/useCurationAIActions.ts` — Rewrite to use wave executors

**Replace** `runAnalyseFlow` internals: instead of calling `analyse-challenge` edge function, call `pass1Executor.executeWaves()` (already wired in `useCurationWaveSetup`). After waves complete, run discovery + extraction + digest steps. Remove `AnalyseProgressPanel` imports and `setAnalyseProgress` references.

**Replace** `handleGenerateSuggestions` internals: instead of calling `generate-suggestions` edge function, first call `generate-context-digest`, then call `pass2Executor.executeWaves()`. The pass2 executor already uses `skipAnalysis=true` with stored Pass 1 comments.

Add two new options to the interface: `executeWavesPass1` and `executeWavesPass2` (from `useCurationWaveSetup`). Remove `setAnalyseProgress`.

### 2. `src/lib/cogniblend/waveConfig.ts` — Unlock all sections

- Remove `legal_docs` and `escrow_funding` from `LOCKED_SECTIONS` array (line 45) so AI generates suggestions for them
- Add `creator_legal_instructions` to Wave 6 `sectionIds`
- Add `organization_context` to Wave 1 `sectionIds` (new pseudo-section for org review)

### 3. `src/lib/cogniblend/curationSectionFormats.ts` — Add missing sections

Add `organization_context` section config:
```typescript
organization_context: {
  format: 'rich_text',
  aiCanDraft: true,
  aiReviewEnabled: true,
  curatorCanEdit: false,
  aiUsesContext: [],
}
```

Add `creator_legal_instructions` section config:
```typescript
creator_legal_instructions: {
  format: 'rich_text',
  aiCanDraft: false,
  aiReviewEnabled: true,
  curatorCanEdit: false,
  aiUsesContext: ['ip_model', 'legal_docs'],
}
```

Change `legal_docs` and `escrow_funding`: set `aiCanDraft: true`, `aiReviewEnabled: true`.

### 4. `src/lib/cogniblend/bulkAcceptHelpers.ts` — Remove skip list

Remove `legal_docs` and `escrow_funding` from `BULK_SKIP_SECTIONS` so Accept All covers them.

### 5. `supabase/functions/review-challenge-sections/index.ts` — Add missing sections

Add to `CURATION_SECTIONS` array:
```typescript
{ key: "creator_legal_instructions", desc: "Legal instructions from the challenge creator — review for clarity and alignment with IP model" },
{ key: "organization_context", desc: "Organization profile completeness — verify description, industry, website, and operating model are sufficient for solver context" },
```

### 6. `src/components/cogniblend/curation/CurationRightRail.tsx` — Remove AnalyseProgressPanel

Remove `AnalyseProgressPanel` import and rendering. Always show `WaveProgressPanel` (which already perfectly supports wave-by-wave progress). Remove `analyseProgress` prop.

### 7. `src/hooks/cogniblend/useCurationPageOrchestrator.ts` — Clean up state

Remove `analyseProgress` state and `setAnalyseProgress`. Remove `IDLE_PROGRESS` import. Stop passing `setAnalyseProgress` to `useCurationAIActions`. Remove `analyseProgress` from return object.

### 8. `src/pages/cogniblend/CurationReviewPage.tsx` — Remove analyseProgress prop

Remove `analyseProgress={o.analyseProgress}` from CurationRightRail props.

### 9. `src/lib/cogniblend/curationSectionDefs.tsx` — Add organization_context to GROUPS

Add `organization_context` to the organization group's `sectionKeys`: `sectionKeys: ["organization_context"]`.

### 10. Delete dead code

- **Delete** `src/components/cogniblend/curation/AnalyseProgressPanel.tsx`
- **Delete** `supabase/functions/analyse-challenge/` (replaced by wave-based per-section calls)
- **Delete** `supabase/functions/generate-suggestions/` (replaced by wave-based per-section calls)
- **Delete** `supabase/functions/curation-intelligence/` (orchestrator for deleted functions)

### 11. Deploy & cleanup

- Delete deployed edge functions: `analyse-challenge`, `generate-suggestions`, `curation-intelligence`
- Redeploy `review-challenge-sections` (with new section definitions)

## Section Coverage After Fix

| Group | Sections | Pass 1 | Pass 2 |
|-------|----------|--------|--------|
| Organization | organization_context | Review | Suggest |
| Foundation | problem_statement, scope, expected_outcomes, context_and_background | Review | Suggest |
| Analysis | root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest | Review | Suggest |
| Specification | solution_type, deliverables, maturity_level, data_resources_provided, creator_references, reference_urls, success_metrics_kpis | Review | Review-only (attachment sections) |
| Assessment | complexity, solver_expertise, eligibility | Review | Suggest |
| Execution | phase_schedule, evaluation_criteria, submission_guidelines, reward_structure, ip_model | Review | Suggest |
| Presentation | hook, visibility, domain_tags, evaluation_config, solver_audience, creator_legal_instructions, legal_docs, escrow_funding | Review | Suggest |

**Total: 33 sections reviewed, ~28 with AI suggestions**

## What This Fixes

1. **All sections reviewed** — zero truncation, one AI call per section
2. **All sections get suggestions** — including legal_docs, escrow_funding, organization
3. **Accept All works for all** — no skip list blocking sections
4. **Real wave progress** — WaveProgressPanel shows each wave's sections completing
5. **Context digest feeds Pass 2** — discovery → extraction → digest → Pass 2 waves
6. **Organization reviewed** — explicit review findings + used as global context
7. **No silent failures** — per-section calls never truncate

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/cogniblend/useCurationAIActions.ts` | Rewrite to use wave executors |
| `src/lib/cogniblend/waveConfig.ts` | Unlock sections, add missing keys |
| `src/lib/cogniblend/curationSectionFormats.ts` | Add organization_context, creator_legal_instructions, unlock legal/escrow |
| `src/lib/cogniblend/bulkAcceptHelpers.ts` | Remove BULK_SKIP for legal/escrow |
| `supabase/functions/review-challenge-sections/index.ts` | Add 2 new section definitions |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Remove AnalyseProgressPanel |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Remove analyseProgress state |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove analyseProgress prop |
| `src/lib/cogniblend/curationSectionDefs.tsx` | Add organization_context to group |
| `src/components/cogniblend/curation/AnalyseProgressPanel.tsx` | DELETE |
| `supabase/functions/analyse-challenge/` | DELETE |
| `supabase/functions/generate-suggestions/` | DELETE |
| `supabase/functions/curation-intelligence/` | DELETE |

