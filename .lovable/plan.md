

# Wiring Plan — Legal Architecture V2 Integration

## Problem
Components for Prompts 4–7 were created but never wired into their parent pages. Six integration gaps exist.

## Changes

### 1. CurationActions — Add freeze-aware submit button
**File**: `src/components/cogniblend/curation/CurationActions.tsx`
- Add `lockStatus`, `governanceMode`, `onFreezeForLegal` props
- When `lockStatus === 'OPEN'` and governance is STRUCTURED/CONTROLLED, rename submit button to "Complete Curation & Send to Legal" and call `onFreezeForLegal` instead of `completePhase`
- When `lockStatus === 'FROZEN'`, show "Content Frozen — Awaiting Legal Review" badge, disable submit/return buttons
- QUICK mode bypasses freeze (existing submit flow unchanged)

### 2. CurationRightRail — Pass freeze callback down
**File**: `src/components/cogniblend/curation/CurationRightRail.tsx`
- Thread new `onFreezeForLegal` prop through to `CurationActions`
- LegalReviewPanel already wired here — no change needed

### 3. CurationReviewPage — Wire freeze callback
**File**: `src/pages/cogniblend/CurationReviewPage.tsx`
- Import `useFreezeForLegalReview` hook
- Create `handleFreezeForLegal` callback that calls `freezeMut.mutate(userId)`
- Pass `lockStatus`, `governanceMode`, `onFreezeForLegal` to `CurationRightRail`

### 4. LcLegalWorkspacePage — Wire assembled CPA components
**File**: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`
- Import `AssembledCpaSection`, `LcReturnToCurator`, `LcApproveAction`
- Add assembled CPA section between the "Challenge Specification" card and the AI suggestions section (around line 665)
- Render `AssembledCpaSection` with challenge data
- Render `LcReturnToCurator` and `LcApproveAction` in the LC action area

### 5. PreFlightGateDialog — Add content integrity check
**File**: `src/components/cogniblend/curation/PreFlightGateDialog.tsx`
- Add optional `integrityCheck` prop: `{ valid: boolean; computedHash: string; storedHash: string | null }`
- When `integrityCheck` is provided and invalid, show a blocking "Content Integrity Failed" error row
- Wire from `CurationReviewPage`: call `verifyContentIntegrity()` before opening pre-flight dialog, pass result as prop

### 6. SolverEnrollmentCTA — Wire CpaEnrollmentGate
**File**: `src/components/cogniblend/solver/SolverEnrollmentCTA.tsx`
- After existing NDA/legal acceptance step, add `CpaEnrollmentGate` step before completing enrollment
- Show CPA acceptance gate inline (replaces old multi-doc model with single CPA)

### 7. SolverLegalGateModal — Update for V2 2-doc model
**File**: `src/components/cogniblend/solver/SolverLegalGateModal.tsx`
- Filter `pendingDocs` to only show V2 document types (SPA, CPA_*) when available
- Fall back to legacy types if no V2 docs configured

### 8. SPA gate — Wire into auth/onboarding flow
**File**: `src/components/auth/AuthGuard.tsx` or appropriate onboarding wrapper
- After authentication, check if user has accepted SPA via a query
- If not accepted, render `SpaAcceptanceGate` overlay before allowing app access

### 9. PWA gate — Wire into MP operating model pages
**Files**: `src/pages/cogniblend/CurationReviewPage.tsx`, `src/pages/cogniblend/LcLegalWorkspacePage.tsx`, `src/pages/cogniblend/EscrowManagementPage.tsx`
- Check operating model; if `MP`, check PWA acceptance status
- If not accepted, show `PwaAcceptanceGate` blocking overlay

## Technical Details

- All new props are optional with sensible defaults to avoid breaking existing callers
- Governance mode resolution uses existing `resolveGovernanceMode()` from `src/lib/governanceMode.ts`
- Content hash verification is async (Web Crypto API) — call in `useEffect` or callback, not in render
- No new database changes needed — all RPCs and columns already exist from Prompt 1

## File Summary
| Action | Files |
|--------|-------|
| Modified | CurationActions.tsx, CurationRightRail.tsx, CurationReviewPage.tsx, LcLegalWorkspacePage.tsx, PreFlightGateDialog.tsx, SolverEnrollmentCTA.tsx, SolverLegalGateModal.tsx, EscrowManagementPage.tsx |
| New | None (possibly a small `useSpaStatus.ts` hook for the SPA gate query) |

