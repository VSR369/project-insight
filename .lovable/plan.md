

# Residual Gaps — Round 2

## Findings

After the previous round fixed the core gaps (RPC upsert, `isBlindMode` in useScreeningReview hook, ENTERPRISE fallbacks in 5 files, test fixtures), there are still **9 locations** with stale naming or logic.

---

### GAP A: `isEnterprise` variable name persists in 4 files

The hook was renamed to `isBlindMode`, but consuming code still uses the old name:

| File | Lines | Issue |
|------|-------|-------|
| `ScreeningReviewPage.tsx` | 75, 86, 137 | `ScoringPanelProps.isEnterprise` — was NOT updated in previous round |
| `ChallengeSubmitSummaryModal.tsx` | 57, 85, 181, 243 | `isEnterprise` variable (controls legal review messaging) |
| `ChallengeWizardBottomBar.tsx` | 52, 54 | `isEnterprise` variable (controls submit label) |
| `useManageChallenge.ts` | 88, 92 | `isEnterprise` variable (controls solver anonymisation) |
| `ChallengeWizardPage.tsx` | 334, 557, 595 | `isEnterprise` variable (controls phase routing) |

**Fix:** Rename all to `isStructuredOrAbove` (matches the function they call). This is purely a readability rename — no logic change.

### GAP B: `ENTERPRISE` string literal in useApprovalActions.ts

Line 53: `params.governanceProfile?.toUpperCase() === 'ENTERPRISE' ? 'R5' : 'R4'`

This compares against the dead `ENTERPRISE` value. Should use `isStructuredOrAbove(resolveGovernanceMode(...))`.

### GAP C: `ENTERPRISE` fallback in useChallengeForm.ts

Line 95: `const profile = governanceProfile || 'ENTERPRISE'`

Should be `|| 'STRUCTURED'`.

### GAP D: `ENTERPRISE` naming in useSolverLegalGate.ts

Lines 20-24: `ENTERPRISE_ONLY_DOC_TYPES` constant and `ENTERPRISE_EVALUATION_TERMS` doc type. The constant name is misleading — these are docs required for STRUCTURED/CONTROLLED modes (non-QUICK). Rename to `NON_QUICK_DOC_TYPES`. The `ENTERPRISE_EVALUATION_TERMS` string is a DB document_type value — check if it needs a DB update too.

### GAP E: Stale comments (cosmetic, 3 files)

- `GovernanceProfileBadge.tsx` line 4: "Backward-compatible with legacy LIGHTWEIGHT/ENTERPRISE"
- `QAManagementCard.tsx` line 3: "ENTERPRISE (MP/AGG) has publish flow; LIGHTWEIGHT is immediate"
- `QAManagementCard.tsx` line 70: "In LIGHTWEIGHT mode"

### GAP F: `PROBLEM_MIN_ENTERPRISE` / `SCOPE_MIN_ENTERPRISE` naming

- `challengeFormSchema.ts` lines 25-28: Exports `PROBLEM_MIN_ENTERPRISE`, `PROBLEM_MIN_LIGHTWEIGHT`, `SCOPE_MIN_ENTERPRISE`, `SCOPE_MIN_LIGHTWEIGHT` as aliases
- `StepProblemContentFields.tsx` lines 17, 19, 34-35: Uses `PROBLEM_MIN_ENTERPRISE` and `SCOPE_MIN_ENTERPRISE`

Rename to `_STRUCTURED`/`_QUICK` or remove aliases and use the canonical names directly.

### GAP G: Test file still has `LIGHTWEIGHT` (missed in previous round)

- `MyChallengesSection.test.tsx` lines 26, 50: `governance_profile: 'LIGHTWEIGHT'` — these were NOT updated
- `Gate02LegalTransition.test.ts` line 130: `governance_profile: 'LIGHTWEIGHT'`
- `GovernanceProfileBadge.test.tsx` lines 13-19: Tests legacy mapping — these are intentional backward-compat tests, keep them

### GAP H: `ScreeningReviewPage.tsx` prop mismatch

The hook now returns `isBlindMode` but `ScreeningReviewPage.tsx` line 75 still declares `isEnterprise` in `ScoringPanelProps` and passes it on line 86. This will cause a runtime bug if the hook property was renamed but the page wasn't fully updated.

---

## Implementation Plan (4 changes)

### 1. Rename `isEnterprise` → `isStructuredOrAbove` in 5 files
- `ScreeningReviewPage.tsx`: Rename prop + usage (lines 75, 86, 137)
- `ChallengeSubmitSummaryModal.tsx`: Rename variable (lines 57, 85, 181, 243)
- `ChallengeWizardBottomBar.tsx`: Rename variable (lines 52, 54)
- `useManageChallenge.ts`: Rename variable (lines 88, 92)
- `ChallengeWizardPage.tsx`: Rename variable (lines 334, 557, 595)

### 2. Fix ENTERPRISE logic/fallbacks in 3 hooks
- `useApprovalActions.ts` line 53: Replace string comparison with `isStructuredOrAbove(resolveGovernanceMode(...))`
- `useChallengeForm.ts` line 95: Change `'ENTERPRISE'` to `'STRUCTURED'`
- `useSolverLegalGate.ts`: Rename `ENTERPRISE_ONLY_DOC_TYPES` → `NON_QUICK_DOC_TYPES`

### 3. Clean up naming aliases and comments
- `challengeFormSchema.ts`: Remove or rename `PROBLEM_MIN_ENTERPRISE`/`SCOPE_MIN_ENTERPRISE`/`PROBLEM_MIN_LIGHTWEIGHT`/`SCOPE_MIN_LIGHTWEIGHT` aliases
- `StepProblemContentFields.tsx`: Use canonical constant names
- Update stale comments in `GovernanceProfileBadge.tsx`, `QAManagementCard.tsx`

### 4. Fix remaining test fixtures
- `MyChallengesSection.test.tsx` lines 26, 50: `'LIGHTWEIGHT'` → `'QUICK'`
- `Gate02LegalTransition.test.ts` line 130: `'LIGHTWEIGHT'` → `'QUICK'`

