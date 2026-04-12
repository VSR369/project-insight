

## Impact Analysis: "Solver" → "Solution Provider" Rename

### Risk Assessment: LOW — with one important addition

The Claude proposal is well-structured and follows the correct two-layer separation principle. **All proposed changes are UI-visible string replacements only** — no variable names, table names, column names, function signatures, or route paths change. This means zero risk of breaking queries, type safety, or API contracts.

However, the proposal **missed one critical item**: the `assemble_cpa` database function (in `supabase/migrations/20260409173639_...sql`) contains hardcoded "Solver" strings in legal text that get rendered to users in CPA documents:

- `'EXCLUSIVE ASSIGNMENT: Solver assigns all rights...'`
- `'NON-EXCLUSIVE LICENSE: Solver retains ownership...'`
- `'Solver agrees to participate in good faith...'`
- `'Solver maintains confidentiality...'`
- `'before solver enrollment...'`
- `'Solver agrees not to engage directly...'`

These appear in generated legal agreements shown to users and must also be updated.

### What stays as "Solver" (confirmed safe to leave)

- All DB tables, columns, function names, variable names, hook names, type names, route paths
- Anonymous review IDs (`Solver-A`, `Solver-B`)
- Internal enum values (`solver_action`)
- DB column references in queries (`solver_audience`, `solver_eligibility_id`, etc.)

### Implementation Plan

The work touches ~40 files across 10 batches. Each batch is independent — pure text replacement with no cross-file dependencies. I will implement them sequentially.

**Batch 1 — Challenge Wizard (5 files)**
`StepProviderEligibility.tsx`, `StepRequirements.tsx`, `StepReviewSubmit.tsx`, `StepRewards.tsx`, `requirementsConstants.ts`
Replace user-facing labels: "Solver Tier" → "Solution Provider Tier", IP option descriptions, etc.

**Batch 2 — Creator Module (8 files)**
`creatorSeedContent.ts`, `EssentialFieldRenderers.tsx`, `EvaluationMethodSection.tsx`, `QuickPublishSuccessScreen.tsx`, `DimensionScoreBadges.tsx`, `ChallengeCreatorForm.tsx`, `CreatorLegalPreview.tsx`, `CreatorPhaseTimeline.tsx`

**Batch 3 — Curation Module (5 files)**
`context-library/types.ts`, `AttachmentCard.tsx`, `curationSectionDefs.tsx`, `sectionDependencies.ts`, `preFlightCheck.ts`

**Batch 4 — Cogniblend Pages (8 files)**
`AISpecReviewPage.tsx`, `ChallengeManagePage.tsx`, `LcLegalWorkspacePage.tsx`, `PublicChallengeDetailPage.tsx`, `PublicationReadinessPage.tsx`, `ScreeningReviewPage.tsx`, `SolutionSubmitConstants.ts`, `DemoLoginPage.tsx`

**Batch 5 — Shared Components (8 files)**
`AccessModelSummary.tsx`, `WorkflowProgressBanner.tsx`, `ChallengeConfigSummary.tsx`, `RequestJourneySection.tsx`, `DemoWorkflowSteps.tsx`, `TargetingFiltersSection.tsx`, `EscrowDepositSection.tsx`, `ExtendDeadlineModal.tsx`

**Batch 6 — Admin Pages (5 files)**
`LegalDocConfigSidebar.tsx`, `LegalDocTriggerForm.tsx`, `PlatformAgreementCard.tsx`, `LifecyclePhaseRow.tsx`, `AIQualityDashboardPage.tsx`, `IncentivesPage.tsx`

**Batch 7 — Legal Constants & Types (3 files)**
`cpaDefaults.constants.ts`, `legal.types.ts`, `OnboardingCompletePage.tsx`

**Batch 8 — ELIGIBILITY_MODELS descriptions (1 file)**
`challengeOptions.constants.ts` — update description strings like "Entry-level certified solvers" → "Entry-level certified Solution Providers"

**Batch 9 — DB: `assemble_cpa` function update (1 migration)**
New migration with `CREATE OR REPLACE FUNCTION public.assemble_cpa(...)` replacing all "Solver" in the legal text output (IP clauses, escrow terms, anti-disintermediation, fallback CPA content). Internal variable names and column references stay unchanged.

**Batch 10 — DB: `lifecycle_phase_config` seed data (data update)**
UPDATE statements to change description text in the `lifecycle_phase_config` table rows from "Solvers submit..." → "Solution Providers submit..."

### Risk Summary

| Area | Risk | Reason |
|------|------|--------|
| UI text in ~40 TSX/TS files | None | Pure string literals, no logic change |
| `cpaDefaults.constants.ts` templates | None | Template text only, no variable names change |
| `legal.types.ts` display labels | None | Values in label map, keys/codes unchanged |
| `assemble_cpa` DB function | Low | `CREATE OR REPLACE` with text changes only; all variable names, column refs, logic unchanged |
| `lifecycle_phase_config` update | None | Display text in description column |
| Overall | **Low** | No structural, type, or API changes anywhere |

### Estimated scope
- ~40 frontend files (text-only edits)
- 2 database operations (1 migration for function, 1 data update for seed rows)
- Zero type/interface changes
- Zero route changes
- Zero hook/service refactoring

