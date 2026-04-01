

# CR Role Code Review — Implementation Plan

## Overview
Implementing findings from the Senior Architect review: 3 critical bugs, 5 medium fixes, and dead code removal. Net ~2,950 lines removed.

## Phase 1: Critical Bug Fixes

### 1.1 BUG-CR-001 — Form validation not updating on governance mode change
**File:** `ChallengeCreatePage.tsx` line 317
Add `key={governanceMode}-${engagementModel}` to `ChallengeCreatorForm` to force remount when mode changes, ensuring the correct Zod resolver is used.

### 1.2 BUG-CR-002 — Operator precedence in Active tab filter
**File:** `MyChallengesPage.tsx` line 94
Add parentheses: `(c.master_status === 'IN_PREPARATION' && c.current_phase > 1) || c.master_status === 'ACTIVE'`

### 1.3 BUG-CR-003 — Snapshot expected_outcomes format mismatch
**File:** `useSubmitSolutionRequest.ts` line 257
Change `filteredPayload.expectedOutcomes || null` to `serializeLineItems(filteredPayload.expectedOutcomes)` so the snapshot matches the challenges table format.

## Phase 2: Dead Code Removal (~3,000 lines)

### 2.1 Delete `SimpleIntakeForm.tsx` (1,151 lines)
Confirmed: zero imports outside the file itself.

### 2.2 Delete `ConversationalIntakePage.tsx` (1,807 lines)
Confirmed: no route in App.tsx, zero external imports.

## Phase 3: Medium Fixes & Cleanup

### 3.1 LineItemsInput key fix
**File:** `LineItemsInput.tsx` line 86
Change `key={index}` to `` key={`item-${index}-${item.slice(0,20)}`} `` for stable drag-and-drop keys.

### 3.2 Extract shared display helpers (DRY)
**Create:** `src/lib/cogniblend/displayHelpers.ts` with `formatCurrency()`, `governanceLabel()`, `complexityColor()` extracted from `CreatorChallengeDetailView.tsx`.
**Update:** `CreatorChallengeDetailView.tsx`, `PublicChallengeDetailPage.tsx`, `MyChallengesPage.tsx` to import from shared module instead of local definitions.

### 3.3 Extract shared draft payload builder
**File:** `useSubmitSolutionRequest.ts`
Extract `buildChallengeUpdatePayload()` shared by `useSaveDraft` and `useUpdateDraft` to eliminate ~150 lines of duplication.

### 3.4 Fix useEffect dependency
**File:** `ChallengeCreatePage.tsx` line 228
Change `[currentOrg?.governanceProfile]` to `[currentOrg]`.

### 3.5 Add explanatory comment for is_deleted client-side filter
**File:** `useMyChallenges.ts` — add comment explaining PostgREST nested filter limitation.

### 3.6 Add pagination prep to useMyChallenges
Add `.order('created_at', { ascending: false }).limit(50)` for scalability.

## Files Summary

| File | Action |
|------|--------|
| `ChallengeCreatePage.tsx` | Add key prop + fix useEffect dep |
| `MyChallengesPage.tsx` | Fix operator precedence |
| `useSubmitSolutionRequest.ts` | Fix snapshot format + extract helper |
| `SimpleIntakeForm.tsx` | DELETE |
| `ConversationalIntakePage.tsx` | DELETE |
| `LineItemsInput.tsx` | Fix key prop |
| `displayHelpers.ts` | CREATE (shared utils) |
| `CreatorChallengeDetailView.tsx` | Import shared helpers |
| `PublicChallengeDetailPage.tsx` | Import shared helpers |
| `useMyChallenges.ts` | Add comment + pagination |

**Not touched:** Curator, LC, FC, ER files. Supabase migrations. Edge functions. App.tsx routing. Auth system. Admin pages.

