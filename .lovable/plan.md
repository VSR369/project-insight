

## Plan: Gate "Submit for Curation" to LC Role Only

### Problem
`LegalDocumentAttachmentPage.tsx` renders the "Submit for Curation" button for all users, including the Challenge Creator (CR). This breaks the lifecycle sequence where only the Legal Coordinator (LC) should advance a challenge from Phase 2 (Legal) to Phase 3 (Curation).

### Correct Workflow
1. CR approves spec → challenge moves to Phase 2
2. CR visits Legal page → can view/attach documents, but can only **send to LC** for review
3. LC reviews documents in their workspace (`LcLegalWorkspacePage`) → LC submits for curation
4. CU reviews in curation queue

### Fix

**File: `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx`**

1. The page already tracks `userHasLcRole` (line ~880). Use this flag to conditionally render the submit button:
   - **If user has LC role**: Show "Submit for Curation" button (current behavior)
   - **If user does NOT have LC role (CR/CA)**: Hide the "Submit for Curation" button entirely. Instead show a prominent "Send to Legal Coordinator" CTA that triggers the existing `legalReviewRequest` mutation, plus a status badge showing LC review state

2. Update the bottom section (lines 994-1016):
   - Replace the always-visible submit button with a conditional block
   - For non-LC users: show an informational card explaining that the LC must review and advance
   - For LC users: keep the existing submit flow

3. The `handleSubmitForCuration` and `handleConfirmSubmit` functions remain unchanged — they're just no longer reachable by CR users

### What This Fixes
- CR can no longer bypass LC and submit directly to curation
- Clear separation of duties: CR attaches docs → LC reviews and advances
- LC's own workspace (`LcLegalWorkspacePage`) already has its own submit-to-curation flow, so this is consistent

### Files Modified
- `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx`

