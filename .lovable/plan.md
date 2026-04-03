

# Fix Plan: Creator → Curator Pipeline + Legal Integration (5 Bugs)

## Bugs to Fix

| Bug | Description | Severity |
|-----|-------------|----------|
| B1 | `lc_compliance_complete` never set TRUE for STRUCTURED mode | Showstopper |
| B2 | LcLegalWorkspacePage bypasses `complete_phase` (direct UPDATE) | Showstopper |
| B3 | LegalDocumentAttachmentPage calls `complete_phase` but crashes on compliance gate | Showstopper |
| B4 | No CU auto-assignment after Phase 2 → 3 in LC workspace | Critical |
| B5 | No CA legal gate on Creator challenge submit | Medium |

---

## Step 1: Migration — Create `complete_legal_review` and `complete_financial_review` RPCs

Create a new migration with two new RPC functions:

- **`complete_legal_review(p_challenge_id, p_user_id)`**: Verifies user has LC role, challenge is at Phase 2, sets `lc_compliance_complete = TRUE`, logs audit. If `fc_compliance_complete` is also TRUE, calls `complete_phase` to auto-advance to Phase 3. Otherwise returns waiting status.

- **`complete_financial_review(p_challenge_id, p_user_id)`**: Same pattern but for FC role and `fc_compliance_complete` flag.

This fixes **B1** by providing an explicit code path to set the compliance flag.

---

## Step 2: Fix LcLegalWorkspacePage (B2 + B4)

**File:** `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

Replace the direct `UPDATE challenges SET current_phase = 3` block (lines 559-565) with a call to the new `complete_legal_review` RPC. After a successful Phase 3 transition, auto-assign CU from pool using `autoAssignChallengeRole`.

- Import `autoAssignChallengeRole`
- Replace direct UPDATE with `supabase.rpc('complete_legal_review', ...)`
- On result showing `current_phase === 3`, call `autoAssignChallengeRole({ roleCode: 'CU', ... })`
- Add `curation-queue` query invalidation

---

## Step 3: Fix LegalDocumentAttachmentPage (B3 + B4)

**File:** `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx`

Replace the `completePhase.mutate()` call (line 665) with `complete_legal_review` RPC, same pattern as Step 2. Remove the `useCompletePhase` import since it's no longer needed in this file.

- Replace `completePhase.mutate(...)` with `supabase.rpc('complete_legal_review', ...)`
- On Phase 3 result, auto-assign CU
- Update button disabled/loading states to use local `isSubmitting` state instead of `completePhase.isPending`

---

## Step 4: Fix CU auto-assign timing in useSubmitSolutionRequest (B4 partial)

**File:** `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

The CU auto-assign block (lines 160-178) runs unconditionally after `complete_phase` for STRUCTURED/CONTROLLED modes. But for STRUCTURED, `complete_phase` stops at Phase 2 (waiting for compliance review). CU should only be assigned after reaching Phase 3.

- Parse the `complete_phase` RPC response to get `current_phase`
- Only run `autoAssignChallengeRole` if `current_phase >= 3`
- For Phase 2 (STRUCTURED waiting for legal review), CU will be assigned later by LcLegalWorkspacePage/LegalDocumentAttachmentPage

---

## Step 5: Add CA legal gate to ChallengeCreatorForm submit (B5)

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`

Wrap the submit handler with a legal gate check for `CHALLENGE_SUBMIT`:

- Add `showLegalGate` and `pendingSubmitData` state
- In `handleSubmit`, store form data and show `LegalGateModal` instead of immediately submitting
- On acceptance, proceed with the existing submit flow
- On decline, show toast and cancel submission
- Import `LegalGateModal` from `@/components/legal/LegalGateModal`

---

## Expected Flow After All Fixes

**STRUCTURED (Chris CR+LC → Casey CU):**
1. Chris fills form → clicks Submit → CA legal gate modal → accepts
2. `useSubmitSolutionRequest` → `complete_phase` → stops at Phase 2 (lc=FALSE) → CU NOT assigned yet
3. Chris navigates to legal workspace → reviews/attaches docs → clicks "Submit to Curation"
4. `complete_legal_review` RPC → sets lc=TRUE → both flags TRUE → `complete_phase` → Phase 3
5. CU auto-assigned from pool → Casey sees challenge in Curation Queue

**QUICK (unchanged):** Auto-advances through all phases, CU assigned immediately.

---

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | `complete_legal_review` + `complete_financial_review` RPCs |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | Replace direct UPDATE with RPC + CU auto-assign |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | Replace `completePhase.mutate` with RPC + CU auto-assign |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Guard CU auto-assign behind Phase 3 check |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Add CA legal gate modal |

