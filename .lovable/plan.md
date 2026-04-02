
# Curator Monolith Decomposition Plan

## Overview
Pure code-movement refactor of 20 oversized files (~18,300 lines total) into ~44 focused files, each under 200 lines. Zero logic changes, zero interface changes, zero DB changes. The code moves but behavior stays identical.

## Safety Contract
Every step follows: **MOVE code, never REWRITE code.** No logic changes, no renaming, no query key changes, no Supabase reference changes. After each phase, the page must render identically.

---

## Phase D1: Zero-Risk Constant Extraction

### Step 1 (D1.1) — Extract SECTION_DEFS + GROUPS + helpers from CurationReviewPage
**Files created:**
- `src/lib/cogniblend/curationSectionDefs.ts` — SECTIONS array, GROUPS array, SECTION_MAP, SectionDef/GroupDef interfaces, LOCKED_SECTIONS, TEXT_SECTIONS constants (~lines 261-986 of CurationReviewPage)
- `src/lib/cogniblend/curationHelpers.ts` — parseJson, LcStatusBadge, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, getSectionContent, computeAutoChecks, resolveIndustrySegmentId (~lines 241-1212)

**Files modified:** CurationReviewPage.tsx — remove ~950 lines, add 2 imports

**Risk:** ZERO — pure data arrays and pure functions with no state dependencies

---

## Phase D2: Data Hook Extraction

### Step 2 (D2.1) — Extract data fetching hook from CurationReviewPage
**File created:** `src/hooks/cogniblend/useCurationPageData.ts` — all ~40 useState declarations + ~9 useQuery/useMutation calls (~lines 1234-1520)

**File modified:** CurationReviewPage.tsx — remove ~300 lines, add hook call + destructure

**Risk:** LOW — declarations only, no closure dependencies

### Step 3 (D2.2) — Extract edge function helper modules
**Files created:**
- `supabase/functions/review-challenge-sections/masterData.ts` — fetchMasterDataOptions
- `supabase/functions/review-challenge-sections/aiCalls.ts` — callAIPass1Analyze, callAIPass2Rewrite
- `supabase/functions/review-challenge-sections/complexity.ts` — callComplexityAI, executeComplexityAssessment

**File modified:** index.ts (1,995 lines → ~1,200 lines)

**Risk:** LOW — self-contained async functions. **Requires edge function redeployment.**

---

## Phase D3: JSX Section Extraction

### Step 4 (D3.1) — Extract Right Rail
**File created:** `src/components/cogniblend/curation/CurationRightRail.tsx` — the 6 right-rail cards (AI Quality, Org Context, Budget, Context Library, Wave Progress, Actions). May split into sub-card files if over 200 lines.

**File modified:** CurationReviewPage.tsx — replace ~362 lines with single component

**Risk:** MODERATE — must identify ~15 closure variables and pass as props

### Step 5 (D3.2) — Extract Section List
**Files created:**
- `src/components/cogniblend/curation/CurationSectionList.tsx` — orchestrator
- `src/components/cogniblend/curation/CurationSectionItem.tsx` — single section rendering

**File modified:** CurationReviewPage.tsx — replace ~930 lines

**Risk:** MODERATE-HIGH — largest closure dependency set (~25+ callbacks + state). This is the highest-risk step.

### Step 6 (D3.3) — Extract Header + Group Navigation
**File created:** `src/components/cogniblend/curation/CurationHeaderBar.tsx` — breadcrumb, title, governance badge, group tabs, action buttons

**File modified:** CurationReviewPage.tsx — replace ~273 lines

**Risk:** MODERATE — manageable ~15 props

---

## Phase D4: Callback Extraction

### Step 7 (D4.1) — Extract section save/edit callbacks
**File created:** `src/hooks/cogniblend/useCurationSectionActions.ts` — handleSaveSection, handleStartEditing, handleCancelEditing, handleToggleApproval, handleAcceptSuggestion, handleRejectSuggestion

**File modified:** CurationReviewPage.tsx — remove ~200 lines

**Risk:** MODERATE-HIGH — callbacks close over state; must pass all referenced state as hook params

### Step 8 (D4.2) — Extract AI review callbacks
**File created:** `src/hooks/cogniblend/useCurationAIActions.ts` — handleWaveSectionReviewed, complexity callbacks, triage callbacks, AI re-review callbacks

**File modified:** CurationReviewPage.tsx — remove ~200 lines

**Risk:** MODERATE

---

## Phase D5: Remaining Component Extraction

### Step 9 (D5.1) — Decompose AIReviewResultPanel (1,355 lines)
**Files created:**
- `src/components/cogniblend/curation/ai-review/ReviewCommentList.tsx`
- `src/components/cogniblend/curation/ai-review/SuggestionPanel.tsx`
- `src/components/cogniblend/curation/ai-review/CrossSectionIssues.tsx`
- `src/components/cogniblend/curation/ai-review/ReviewConfigs.ts`

**AIReviewResultPanel.tsx becomes ~180-line orchestrator**

### Step 10 (D5.2) — Decompose promptTemplate.ts (1,675 lines)
**Files created:**
- `supabase/functions/review-challenge-sections/promptBuilders.ts`
- `supabase/functions/review-challenge-sections/pass2Prompt.ts`
- `supabase/functions/review-challenge-sections/industryGeoPrompt.ts`
- `supabase/functions/review-challenge-sections/contextIntelligence.ts`

**promptTemplate.ts becomes ~50-line barrel re-export. Requires edge function redeployment.**

### Step 11 (D5.3) — Decompose ComplexityAssessmentModule + AIReviewInline
**Files created (6):**
- ComplexityRatingSliders.tsx, ComplexityResultCard.tsx, useComplexityScoring.ts
- AIReviewHeader.tsx, AIReviewSectionResults.tsx, useAIReviewRunner.ts

### Step 12 (D5.4) — Decompose 8 Priority 2 files (500-711 lines each)
**Files created (12):** RewardTierEditor, RewardSummaryCard, CreatorApprovalSection, CreatorProgressSection, SectionPanelToolbar, SectionContentRenderer, ChecklistGroupCard, BriefFieldRenderer, SubmitForApprovalDialog, ReturnToDraftDialog, ExpertiseTagEditor, OrgDetailCards

---

## Phase D6: Final Cleanup

### Step 13 (D6.1) — Decompose 6 Priority 3 files (300-440 lines each)
**Files created (8):** FileUploadCard, UrlReferenceCard, CriteriaRowEditor, WeightDistributionBar, waveExecutionLoop, curationSelectors, EditorToolbar, QualityMetricCard

### Step 14 (D6.2) — Verify CurationReviewPage is under 200 lines
Final thin orchestrator with imports from extracted modules

### Step 15 (D6.3) — Full regression test
12-point verification across all decomposed files

---

## Execution Order

| Step | Prompt | Risk | CurationReviewPage After |
|------|--------|------|--------------------------|
| 1 | D1.1 Constants | ZERO | ~3,450 lines |
| 2 | D2.1 Data hook | LOW | ~3,150 lines |
| 3 | D2.2 Edge fn modules | LOW | N/A (edge fn) |
| 4 | D3.1 Right Rail | MODERATE | ~2,790 lines |
| 5 | D3.2 Section List | MOD-HIGH | ~1,860 lines |
| 6 | D3.3 Header | MODERATE | ~1,590 lines |
| 7 | D4.1 Section callbacks | MOD-HIGH | ~1,390 lines |
| 8 | D4.2 AI callbacks | MODERATE | ~1,190 lines |
| 9-12 | D5.1-D5.4 | LOW-MOD | Other files |
| 13-15 | D6.1-D6.3 | LOW | ~180 lines final |

## Key Risks and Mitigations

1. **D3.2 (Section List)** is the highest-risk step due to ~25+ closure dependencies. Will carefully audit every variable reference before extraction.
2. **D2.2 and D5.2** touch edge functions — require redeployment after changes.
3. **No file will be created over 200 lines.** If extraction exceeds limit, sub-split immediately.
4. **All exported interfaces preserved exactly.** No downstream consumer changes needed.

## Totals
- ~44 files created, ~20 files modified, 0 deleted
- 0 interface changes, 0 DB changes, 0 business logic changes
- ~74% reduction in monolithic code (18,300 → ~4,600 lines across same files)
