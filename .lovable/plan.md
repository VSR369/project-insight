

# Section Dependency UX Guidance — Implementation Plan

## Summary
Add soft prerequisite guidance to the Curation Review page: numbered tabs with readiness indicators, prerequisite banners, per-section dependency badges, and an optional guided mode. No hard locks — curators can always browse and act, but get visual cues about optimal sequencing.

## Files Modified
1. `src/pages/cogniblend/CurationReviewPage.tsx` — GroupDef type, GROUPS rewrite, groupReadiness/sectionReadiness computations, tab strip indicators, prerequisite banner, guided mode toggle + Next button
2. `src/components/cogniblend/shared/AIReviewInline.tsx` — Add `prerequisitesReady` + `missingPrerequisites` props for soft re-review warning
3. `src/lib/cogniblend/sectionDependencies.ts` — Export a reverse dependency map (`getUpstreamDependencies`) for per-section prereq display

## Technical Details

### 1. GroupDef Type + GROUPS Rewrite (lines 892-950)
Update `GroupDef` interface to add `prerequisiteGroups: string[]` and optional `icon: string`. Replace the 6-group GROUPS array with:
- "1. Foundation" (problem_statement, scope, expected_outcomes, context_and_background) — no prereqs
- "2. Analysis" (root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest) — needs foundation
- "3. Specification" (solution_type, deliverables, maturity_level, data_resources_provided, success_metrics_kpis) — needs foundation
- "4. Assessment" (complexity, solver_expertise, eligibility) — needs specification
- "5. Execution" (phase_schedule, evaluation_criteria, submission_guidelines, reward_structure, ip_model) — needs specification + assessment
- "6. Publish" (hook, visibility, domain_tags, legal_docs, escrow_funding) — needs execution

Also update the `activeGroup` initial state from `"problem_definition"` to `"foundation"`.

### 2. groupReadiness Computation (~40 lines, after hooks section)
A `useMemo` that iterates `GROUPS`, checks each group's `prerequisiteGroups`, determines what percentage of critical sections (excluding optional ones like preferred_approach, approaches_not_of_interest, legal_docs, escrow_funding) are filled in prerequisite groups. Returns `Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }>`. Threshold: 50% of critical sections filled = ready.

### 3. Upstream Dependencies Map (sectionDependencies.ts)
Add exported function `getUpstreamDependencies(sectionKey)` that inverts `DIRECT_DEPENDENCIES` — returns which sections this section depends on (i.e., sections whose changes affect this one). Used for per-section prereq badges.

### 4. sectionReadiness Computation (~20 lines)
A `useMemo` in CurationReviewPage that uses `getUpstreamDependencies` to compute `Record<string, { ready: boolean; missing: string[] }>` for each section, checking if upstream dependencies are filled.

### 5. Tab Strip Visual Indicators (lines 2928-2970)
Replace the tab button rendering to:
- Add step number icons from `group.icon`
- Dim tabs where `!readiness.ready` with `opacity-60`
- Show "⏳ Needs {prereqGroupLabel}" badge on unready tabs
- Keep existing stale count badge and checkmark logic

### 6. Prerequisite Alert Banner (after CardHeader, before section list ~line 3019)
When `groupReadiness[activeGroupDef.id]?.ready === false`, render an amber banner with:
- Warning icon + "Complete prerequisite sections first for best AI results"
- Lists which prerequisite groups are missing
- Quick-navigate buttons to incomplete prerequisite sections (max 4)
- "Continue anyway" dismiss button (session state, not persisted)

Add `const [dismissedPrereqBanner, setDismissedPrereqBanner] = useState<Set<string>>(new Set())` state.

### 7. Per-Section Dependency Badge (in section card header area ~line 3030)
Inside the `.map(sectionKey => ...)` loop, after computing `panelStatus`, check `sectionReadiness[sectionKey]`. If not ready, render a small amber tooltip badge showing count of missing prereqs. Pass section label from SECTION_MAP. Uses `Tooltip` + `TooltipTrigger` + `TooltipContent` from UI components.

### 8. AIReviewInline Soft Warning (AIReviewInline.tsx)
Add optional props `prerequisitesReady?: boolean` and `missingPrerequisites?: string[]`. When `prerequisitesReady === false`:
- First click on Re-review shows a warning toast ("For best results, complete X, Y first. Click again to proceed anyway.")
- Uses internal `prereqWarningShown` state (resets after proceeding)
- No hard block — second click proceeds normally

In CurationReviewPage, pass these props when rendering CurationAIReviewInline based on sectionReadiness.

### 9. Guided Mode Toggle + Next Button (~30 lines)
Add `const [guidedMode, setGuidedMode] = useState(false)` state.
- In the page header area (line ~2726), add a Switch + label "Guided mode (step-by-step)" / "Free browse"
- When guidedMode is ON, render a fixed-position "Next: {nextGroupLabel}" button at bottom-right
- Button finds the next incomplete group and sets activeGroup
- Import `Switch` from `@/components/ui/switch`, `ArrowRight` from lucide-react

### 10. Import Updates
- Add `Switch` from `@/components/ui/switch`
- Add `ArrowRight` to the lucide-react import
- Add `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip`
- Add `getUpstreamDependencies` from sectionDependencies

## Implementation Order
1. `sectionDependencies.ts` — add `getUpstreamDependencies` function
2. `AIReviewInline.tsx` — add prerequisite props + soft warning
3. `CurationReviewPage.tsx` — all UI changes (GroupDef, GROUPS, computations, tab strip, banner, badges, guided mode)

## What This Does NOT Do
- No hard locks on tabs or actions
- No blocking of Accept or manual editing
- Guided mode defaults to OFF
- No changes to AI wave execution or edge functions

