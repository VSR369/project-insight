
# Plan — Fix FC escrow visibility and editing so the screen reflects actual workflow

## Root cause confirmed

There are two different issues, and both are real:

### 1. FC is only reading `escrow_records`, not Creator/Curator escrow inputs
The current FC screen hydrates from `useEscrowDeposit`, which reads only `public.escrow_records`.

That means:
- if Creator or Curator entered only **escrow recommendation/context** in challenge data (`extended_brief`, reward structure, footer transparency UI),
- but no row was created in `escrow_records`,
- FC sees:
  - `RecommendedEscrowCard`
  - but **no actual bank/deposit record**
  - therefore the form appears effectively empty.

This matches the current network trace:
```text
GET /escrow_records?...challenge_id=eq.25ca71...
Response: []
```

So the screen is not failing to render data that exists in `escrow_records`; there is currently **no escrow record row** for this challenge.

### 2. The form is intentionally disabled before Phase 3
Current challenge state:
```text
current_phase = 2
```

Current view logic:
```ts
const phaseGateOpen = (currentPhase ?? 0) >= 3;
const isEditable = phaseGateOpen && !fcComplianceComplete && !isFunded;
```

That means at Phase 2:
- fields render
- but all inputs are disabled
- submit is disabled
- proof upload is disabled

So “not allowing to enter escrow deposit details” is caused by the current lifecycle gate, not by a rendering bug.

## Why the current UX feels wrong

The present implementation mixes two different concepts without making the distinction clear:

```text
A. Recommended escrow context
   - reward total
   - creator/curator notes
   - suggested amount
   - comes from challenge data / extended_brief

B. Actual escrow deposit record
   - bank name
   - branch
   - account reference
   - IFSC/SWIFT
   - transfer reference
   - proof
   - comes from escrow_records
```

Today the FC page assumes B exists if FC should see details.  
But for this challenge, only A exists and B does not.

So the result is:
- FC sees recommendation context
- FC does not see saved bank/deposit details
- FC cannot edit because Phase 2 locks inputs

## What to build

## 1. Make the source-of-truth split explicit in the UI
Update `FcEscrowReviewTab` so it shows two clearly labeled sections:

### Escrow Recommendation
From challenge data:
- reward total
- recommended escrow amount
- curator/creator notes
- governance requirement

### Escrow Deposit Record
From `escrow_records`:
- actual bank/deposit/proof data
- status badge
- funded summary

When no `escrow_records` row exists, show a precise state:
```text
No escrow deposit record has been created yet.
Creator/Curator guidance is shown above, but actual bank and deposit details have not yet been captured.
```

This removes the false impression that data is “missing” when it was never persisted to the FC record table.

## 2. Decouple “can prepare fields” from “can confirm deposit”
Refactor `fcFinanceWorkspaceViewService.ts` so it no longer uses one `isEditable` flag for everything.

Replace with separate capabilities such as:
- `isPreview`
- `isFunded`
- `canEditDepositFields`
- `canUploadProof`
- `canConfirmEscrow`
- `canSubmitFinanceReview`

Recommended behavior:

### Before Phase 3
Allow:
- bank name
- branch
- bank address
- currency
- deposit amount
- deposit date
- deposit reference
- account number
- IFSC/SWIFT
- FC notes

Keep disabled:
- proof upload
- final “Confirm Escrow Deposit”
- final finance review submit

### At Phase 3
Enable:
- proof upload
- confirm escrow deposit
- finance review completion path

This preserves lifecycle governance while solving the current usability problem.

## 3. Support draft escrow persistence before final confirmation
Right now `useFcEscrowConfirm` only writes on final confirmation and sets:
```ts
escrow_status: 'FUNDED'
```

That is too late for a preparation workflow.

Add a separate draft save path so FC can persist preparatory details before Phase 3 without falsely marking the deposit as funded.

Recommended approach:
- if no row exists, insert `escrow_records` draft row
- if row exists, update it
- preserve status as non-funded (`PENDING` or existing non-funded status)
- only switch to `FUNDED` on final confirm at Phase 3

This is the missing functional bridge between:
- “I want to prepare escrow details now”
- and
- “I cannot confirm funding until Phase 3”

## 4. Pull org finance defaults when no escrow record exists
The codebase already has `useOrgFinanceConfig`.

Use it to prefill the FC form when `escrow_records` is empty:
- default bank name
- default branch
- default bank address
- preferred escrow currency

Recommended default precedence:
```text
1. escrow_records actual saved values
2. organization finance defaults
3. challenge recommendation context
4. reward total / currency fallback
```

This will stop the screen from looking blank on first entry.

## 5. Keep Creator/Curator recommendation separate from FC deposit facts
Do not silently treat creator/curator recommendation fields as if they were confirmed bank instructions.

Instead:
- show recommendation/context in `RecommendedEscrowCard`
- use them only as hints/defaults where appropriate
- keep actual deposit data in `escrow_records`

This aligns with the existing domain model and avoids data integrity confusion.

## 6. Update form copy so FC understands the lifecycle
Change the current preview copy from passive “review only” wording to explicit preparation wording:

### Before Phase 3
```text
You can prepare and save escrow deposit details now.
Proof upload and final funding confirmation unlock at Phase 3.
```

### Empty-state when no record exists
```text
No escrow deposit record exists yet.
Use the form below to prepare the bank and deposit details for this challenge.
```

### If only recommendation exists
```text
The recommendation above came from Creator/Curator challenge data.
Actual escrow deposit details must be saved separately below.
```

## Files to update

### Modify
- `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
  - split lifecycle/view flags
  - support pre-Phase-3 field editing
  - keep confirm/submit gated

- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
  - separate recommendation vs actual deposit record
  - improve empty-state messaging
  - pass new capability flags to the form

- `src/pages/cogniblend/EscrowDepositForm.tsx`
  - allow editable preparation mode before Phase 3
  - disable only proof/final confirm when gated
  - add clearer explanatory copy

- `src/hooks/cogniblend/useFcEscrowConfirm.ts`
  - add draft save/update mutation path
  - keep final confirm as funded transition only
  - reset/invalidate correctly after draft or final save

- `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
  - extend `buildEscrowFormDefaults` to accept org finance defaults when no record exists

### Add / wire
- connect `useOrgFinanceConfig` into the FC workspace flow
- optionally add a small service for form default precedence if needed to keep files under 250 lines

## Verification after implementation

1. Challenge in Phase 2 with no `escrow_records` row:
   - FC sees recommendation context
   - FC sees clear “no deposit record yet” state
   - FC can type bank/deposit details
   - FC can save draft
   - proof upload and final confirm remain disabled

2. Challenge in Phase 2 after draft save:
   - FC revisits page
   - saved bank/deposit details are visible from `escrow_records`

3. Challenge in Phase 3:
   - proof upload becomes enabled
   - final confirm becomes enabled
   - successful confirm marks record `FUNDED`

4. Funded challenge:
   - read-only funded summary shows actual saved data

5. No direct Supabase access added to presentation components
6. No file exceeds 250 lines
7. `npx tsc --noEmit` passes

## Final diagnosis

The problem is not fully solved because:
- there is currently **no actual escrow record row** for this challenge, so FC has no saved bank/deposit details to display, and
- the current code still **hard-locks all input before Phase 3**, so FC cannot prepare details even though the UI suggests they should.

The correct fix is to support:
- recommendation visibility,
- draft escrow preparation before Phase 3,
- and final funding confirmation only at Phase 3.
