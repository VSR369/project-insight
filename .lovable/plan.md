

# Phase 5: Wave-Based Execution Engine + Budget Shortfall Auto-Revision

## Current State

- **Global AI Review** (`handleAIReview`) uses a 2-phase pipeline: Phase 1 triage (single call to `triage-challenge-sections`), then Phase 2 sequential deep review of warning/inferred sections via `review-challenge-sections`
- **No pre-flight gate** — the review runs even if Problem Statement and Scope are empty
- **No wave ordering** — Phase 2 processes sections in queue order, not dependency order
- **No budget shortfall detection** — reward validation exists in post-LLM validation but doesn't trigger auto-revision
- **Context assembler** (`buildChallengeContext`) and **post-LLM validation** (`validateAIOutput`) from Phase 4 are fully operational
- **Staleness tracking** infrastructure exists (store fields, dependency map, `getTransitiveDependents`)

## Architecture

```text
User clicks "Review Sections by AI"
  │
  ├── preFlightCheck() ── blocks if Problem Statement or Scope empty
  │     └── PreFlightGateDialog (modal) with "Go to [section]" buttons
  │
  ├── Wave Executor (sequential)
  │     Wave 1: Foundation (4 sections)  ── review or generate
  │     Wave 2: Enrichment (5 sections)  ── uses Wave 1 output
  │     Wave 3: Complexity (3 sections)  ── uses W1+W2
  │     Wave 4: Solvers & Timeline (4)   ── uses W1+W2+W3
  │     Wave 5: Eval & Commercial (5)    ── budget shortfall check
  │     Wave 6: Presentation (3)         ── uses all prior
  │
  ├── WaveProgressPanel (replaces current Phase 2 progress bar)
  │
  └── BudgetRevisionPanel (conditional, after Wave 5)
```

## Implementation Plan

### Step 1: Pre-Flight Gate

**New file: `src/lib/cogniblend/preFlightCheck.ts`**
- `preFlightCheck(sections)` → `{ canProceed, missingMandatory, warnings }`
- Mandatory (blocks): `problem_statement`, `scope` (min 50 chars)
- Recommended (warns): `context_and_background`, `expected_outcomes`, `deliverables` (min 30 chars)
- Note: section keys use `context_and_background` (not `context_background`) per `SECTION_FORMAT_CONFIG`

**New file: `src/components/cogniblend/curation/PreFlightGateDialog.tsx`**
- Two dialog variants: blocking (mandatory missing) and warning (recommended missing)
- Blocking: red X icons, "Go to [section]" buttons that scroll/navigate to the section
- Warning: amber icons, "Fill them first" and "Proceed with AI generation" buttons
- Uses shadcn `Dialog` with `onOpenChange` disabled when blocking

### Step 2: Wave Executor

**New file: `src/lib/cogniblend/waveConfig.ts`**
- `EXECUTION_WAVES` array with 6 waves, each containing `waveNumber`, `name`, `sectionIds`, `prerequisiteSections`
- Section IDs mapped to actual keys from `SECTION_FORMAT_CONFIG`:
  - Wave 1: `problem_statement`, `scope`, `expected_outcomes`, `context_and_background`
  - Wave 2: `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`
  - Wave 3: `deliverables`, `maturity_level`, `complexity`
  - Wave 4: `solver_expertise`, `eligibility`, `phase_schedule`, `submission_guidelines`
  - Wave 5: `evaluation_criteria`, `reward_structure`, `ip_model`, `legal_docs`, `escrow_funding`
  - Wave 6: `hook`, `visibility`, `domain_tags`
- `determineSectionAction(sectionId, context)` → `'review' | 'generate' | 'skip'`
  - Locked sections (`legal_docs`, `escrow_funding`): `'review'` if content exists, `'skip'` otherwise
  - Empty sections: `'generate'`
  - Sections with content: `'review'`

**New file: `src/hooks/useWaveExecutor.ts`**
- Core execution loop that processes waves sequentially
- For each wave: determines section actions, calls `review-challenge-sections` edge function per section (reusing existing `reviewSingle` pattern), runs post-LLM validation
- Updates running context between waves (re-serializes store sections)
- Exposes: `executeWaves()`, `reReviewStale()`, `cancelReview()`, `waveProgress` state
- Cancel: sets a ref flag; after current wave completes, stops
- Tracks per-wave status: `pending | running | completed | error`
- Clears staleness on successfully reviewed/generated sections
- 500ms pause between waves for rate limiting

### Step 3: Wave Progress UI

**New file: `src/components/cogniblend/curation/WaveProgressPanel.tsx`**
- Replaces the current Phase 2 progress bar in the right sidebar
- Shows 6 waves with checkmark/spinner/circle icons
- Per-wave: name, section count, reviewed vs generated counts
- Overall progress bar (wave N of 6 = N/6 * 100%)
- Cancel button that stops after current wave
- Completion summary with pass/warning/generated counts

### Step 4: Replace handleAIReview

**Modified: `src/pages/cogniblend/CurationReviewPage.tsx`**
- Before executing: call `preFlightCheck()`, show dialog if blocked/warnings
- Replace the 2-phase pipeline with the wave executor
- Wire `WaveProgressPanel` into the right sidebar (replacing Phase 2 progress bar)
- Keep `aiReviewInFlightRef` for double-click guard
- Stale re-review button calls `reReviewStale()` from the wave executor

### Step 5: Budget Shortfall Detection

**New file: `src/lib/cogniblend/budgetShortfallDetection.ts`**
- `detectBudgetShortfall(context)` → `BudgetShortfallResult | null`
- Computes: `minimumReward = effortMidpoint × effortRateFloor`
- Gap strategies: ≤20% ADD_NON_MONETARY, 21-40% REDUCE_SCOPE, 41-60% REDUCE_MATURITY, >60% FUNDAMENTAL_RESCOPE
- Returns: `originalBudget`, `minimumViableReward`, `gap`, `gapPercentage`, `strategy`, `requiresAMApproval`
- Pure function — no AI call here, just detection and strategy recommendation

**New file: `src/components/cogniblend/curation/BudgetRevisionPanel.tsx`**
- Rendered conditionally after Wave 5 completes when shortfall detected
- Shows budget vs minimum, gap %, strategy name
- Lists revised sections with original → revised diff
- Three actions: "Accept & Send to AM", "Modify Manually", "Reject"
- Accept: applies revised content to store sections, creates notification (via edge function or direct insert)
- Modify: navigates to reward_structure section
- Reject: dismisses panel, keeps original content

### Step 6: AM Notification

- On "Accept & Send to AM": insert into `notifications` table with `type: 'budget_revision'`
- Include revision summary in `metadata` JSONB field
- Uses existing notification patterns if they exist, or creates a simple insert

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/cogniblend/preFlightCheck.ts` | Pre-flight validation logic |
| `src/lib/cogniblend/waveConfig.ts` | Wave definitions and section action logic |
| `src/hooks/useWaveExecutor.ts` | Wave execution engine hook |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | Pre-flight blocking/warning dialog |
| `src/components/cogniblend/curation/WaveProgressPanel.tsx` | Wave progress UI |
| `src/lib/cogniblend/budgetShortfallDetection.ts` | Budget shortfall detection logic |
| `src/components/cogniblend/curation/BudgetRevisionPanel.tsx` | Budget revision UI |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Replace `handleAIReview` with wave executor, add pre-flight gate, render WaveProgressPanel and BudgetRevisionPanel |

## Key Design Decisions

1. **Reuse existing edge functions**: Each wave calls `review-challenge-sections` per section (same as current Phase 2 deep review), not a new batch edge function. This keeps the existing prompt/response infrastructure intact.
2. **Client-side orchestration**: The wave sequencing happens in the React hook, not server-side. This matches the existing pattern and keeps the edge function stateless.
3. **No new DB migration needed**: Budget shortfall detection is pure client-side logic using the already-available rate card and context assembler.

