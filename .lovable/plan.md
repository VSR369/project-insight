
# Revised Plan — FC completes the full escrow workflow immediately in CONTROLLED mode; Curator owns STRUCTURED mode

## Product decision now locked

Based on your clarification, the target behavior should be:

```text
CONTROLLED
- FC owns escrow completion end-to-end
- FC enters/saves escrow details
- FC uploads proof
- FC confirms funding
- FC shares/returns to Curator
- No separate waiting for “Phase 3” inside the FC workspace

STRUCTURED
- Curator owns escrow
- FC workspace is not part of the STRUCTURED escrow flow
```

So the current Phase-3 gate in the FC workspace is misaligned with your intended workflow and should be removed for FC actions.

## What is wrong in the current implementation

### 1. The FC workspace is still gated by `current_phase >= 3`
Current logic in `fcFinanceWorkspaceViewService.ts` makes proof upload and confirmation depend on:

```ts
const phaseGateOpen = (currentPhase ?? 0) >= 3;
```

That causes:
- proof upload disabled
- confirm button disabled
- confusing “unlocks at Phase 3” messaging

### 2. The footer still assumes finance review only happens at Phase 3
`FcFinanceSubmitFooter.tsx` currently disables submit when:

```ts
currentPhase !== 3
```

So even if FC has completed escrow, the handoff is still blocked by the old lifecycle rule.

### 3. “Phase 3” is being used as a hardcoded workflow gate instead of a display concept
The progress banner maps:
- Phase 2 → Curation
- Phase 3 → Compliance

But your required business behavior is:

```text
Once the challenge is in FC workspace for CONTROLLED,
FC should be able to finish escrow immediately.
```

So the FC workflow must no longer be hard-bound to `current_phase === 3`.

### 4. STRUCTURED and CONTROLLED behavior need to remain distinct
The code and memory already support this split conceptually:
- CONTROLLED: FC handles escrow
- STRUCTURED: Curator handles escrow

That distinction should be preserved and made explicit in UI/service logic.

## Updated implementation scope

## 1. Remove the Phase-3 gate from CONTROLLED FC completion
Refactor FC capability logic so CONTROLLED FC actions do not depend on `current_phase >= 3`.

In `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`:
- stop using `phaseGateOpen` as the controller for FC actions
- replace with business-capability flags based on:
  - governance mode
  - FC completion status
  - escrow funded state

Recommended behavior for CONTROLLED:
- `canEditDepositFields = !fcComplianceComplete && !isFunded`
- `canUploadProof = !fcComplianceComplete && !isFunded`
- `canConfirmEscrow = !fcComplianceComplete && !isFunded`
- `canSubmitFinanceReview = isFunded && !fcComplianceComplete`

This makes FC self-sufficient in its own workspace.

## 2. Keep STRUCTURED out of FC workflow
Do not extend FC escrow ownership to STRUCTURED.

In `FcFinanceWorkspacePage.tsx`:
- keep or strengthen the governance guard so FC workspace is only active for CONTROLLED / enterprise-style modes
- improve the “not applicable” message to say clearly:
  - “In Structured governance, escrow is handled by the Curator.”
  - “Finance Coordinator workflow applies only to Controlled governance.”

This removes ambiguity.

## 3. Redefine the FC sequence
The FC workspace sequence should become:

```text
Escrow Recommendation / Context
→ FC Deposit Record Entry
→ Save Escrow Details
→ Upload Proof
→ Confirm Funding
→ Share with Curator / Submit Financial Review
```

Not:

```text
wait for Phase 3
→ then start finance
```

## 4. Update the mutation flow to match real ownership
`useFcEscrowConfirm.ts` currently still treats proof/funding as lifecycle-gated behavior.

Refactor it into two explicit actions:

### A. Save Escrow Details
- insert or update `escrow_records`
- status remains non-funded (`PENDING` or equivalent)
- available immediately in FC workspace

### B. Confirm Funding
- requires:
  - bank details present
  - proof uploaded
  - amount validated
- updates `escrow_status = 'FUNDED'`
- available immediately in FC workspace
- should no longer wait for `current_phase === 3`

Then keep final FC completion / curator handoff separate from funding confirmation if needed.

## 5. Update the footer logic to remove current-phase blocking
In `src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx`:
- remove `currentPhase === 3` as the submit gate
- submit should depend on:
  - funded escrow
  - FC not already completed
  - not currently submitting

Recommended logic:
```text
Submit enabled when escrow is FUNDED and FC review not yet complete.
```

Copy should change from:
- “Finance review applies at Phase 3”

to something like:
- “Once escrow is funded, FC can submit the financial review and return the challenge to Curator.”

## 6. Replace all misleading “unlocks at Phase 3” copy
Update FC UI text in:
- `FcEscrowReviewTab.tsx`
- `EscrowDepositForm.tsx`
- `FcFinanceSubmitFooter.tsx`

Remove wording that implies:
- a hidden manual unlock
- a separate future lifecycle gate

Replace with explicit ownership wording:

### For CONTROLLED
```text
Finance Coordinator completes escrow here:
1. Save escrow details
2. Upload deposit proof
3. Confirm funding
4. Submit financial review / return to Curator
```

### For STRUCTURED
```text
Escrow is managed by the Curator in Structured governance.
```

## 7. Make Creator/Curator escrow input visible as recommendation, not as FC-owned facts
You specifically asked to check whether Creator-entered escrow details are streaming through.

Current architecture indicates:
- Creator/Curator escrow context lives in challenge-level data / recommendation fields
- FC deposit facts live in `escrow_records`

So the revised UI should explicitly show:

### Escrow Recommendation
- creator/curator context
- recommended amount
- notes
- source label: “From challenge context”

### FC Deposit Record
- bank name
- branch
- account reference
- deposit reference
- proof
- funded status
- source label: “Finance Coordinator record”

This avoids the false expectation that recommendation data should automatically appear as a confirmed deposit record.

## 8. Improve Curator handoff language
The handoff should be described as:
- FC completes escrow
- FC submits / returns to Curator
- Curator continues the process

So in the footer and success toasts, use wording like:
- “Escrow funded and financial review submitted to Curator”
- “Returned to Curator for next action”

## 9. Align the progress UI with the real business rule
The progress banner can still display overall lifecycle, but it must not block FC actions.

Implementation rule:
- `WorkflowProgressBanner` remains informational
- lifecycle step display does not determine FC form editability in CONTROLLED mode

This separates:
- status display
- permission logic

## Files to update

### Modify
- `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
  - remove phase-based gating for CONTROLLED FC actions
  - make capabilities governance-driven instead

- `src/pages/cogniblend/FcFinanceWorkspacePage.tsx`
  - pass governance-aware capability state
  - keep STRUCTURED excluded from FC workflow
  - update explanatory copy

- `src/hooks/cogniblend/useFcEscrowConfirm.ts`
  - support immediate FC save/proof/confirm flow
  - separate draft save from funded confirmation cleanly
  - remove hidden dependency on Phase 3 behavior

- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
  - update recommendation vs FC record framing
  - remove “Phase 3 unlock” wording
  - explain FC ownership clearly

- `src/pages/cogniblend/EscrowDepositForm.tsx`
  - enable proof upload immediately for CONTROLLED FC workflow
  - keep field actions aligned with FC ownership
  - rename buttons/copy for clarity

- `src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx`
  - remove `currentPhase === 3` submit lock
  - enable submit once funded
  - rewrite helper text

### Optional small extraction
- a dedicated service/helper for FC capability policy if needed to keep files under 250 lines

## Expected behavior after the revision

### CONTROLLED challenge
FC opens Finance Workspace and can immediately:
1. view creator/curator escrow recommendation
2. enter or update bank/deposit details
3. upload proof
4. confirm funding
5. submit financial review / return to curator

No waiting for a separate Phase 3 gate.

### STRUCTURED challenge
FC workspace does not apply.
Curator owns escrow handling.

## Verification

1. CONTROLLED challenge with FC access:
   - escrow details can be entered immediately
   - proof upload is enabled immediately
   - confirm funding is enabled once required fields are complete
   - footer submit is enabled after funded status
   - no “Phase 3 unlock” text remains

2. STRUCTURED challenge:
   - FC workspace is not used
   - message clearly states Curator owns escrow

3. Creator/Curator recommendation-only challenge:
   - recommendation appears clearly
   - FC deposit record is shown as separate actual record area

4. Funded challenge:
   - FC can submit/return to Curator without current-phase blocking

5. No file exceeds 250 lines
6. No direct Supabase calls are introduced into presentation components
7. `npx tsc --noEmit` passes

## Final rule set to implement

```text
CONTROLLED = FC owns full escrow completion now
STRUCTURED = Curator owns escrow
Progress banner = informational only
Recommendation != FC deposit record
Funded escrow = prerequisite for FC submit
Phase number must not block FC completion in CONTROLLED mode
```
