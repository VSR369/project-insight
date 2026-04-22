
# Plan — Separate Legal from FC Escrow Review and expose escrow/bank workflow correctly

## What is happening now

Two current implementation choices are causing the confusion:

1. `FcFinanceWorkspacePage` renders `FcLegalDocsViewer` inside the **Finance Review** tab, so Legal appears as the first block of the FC review screen.
2. The escrow entry form is intentionally hidden while the challenge is still in preview:
   ```text
   phaseGateOpen = current_phase >= 3
   isPreview = !phaseGateOpen
   ```
   and the form only renders when:
   ```text
   !isPreview && !fcDone && !isFunded
   ```
   So on your current challenge route, FC sees legal/reference content and recommended escrow context, but **cannot yet enter bank/deposit details**.

That means the screen is behaving per current code, but the UX is misaligned with the intended FC workflow.

## What to change

### 1. Redefine the FC information architecture
Make FC workspace primarily about escrow, not legal.

New FC workspace structure:

```text
Finance Workspace
├── Escrow Review        ← default
│   ├── Recommended Escrow
│   ├── Existing Escrow Status / Summary
│   ├── Bank + deposit details form
│   └── Submit / Return actions
├── Curated Challenge    ← read-only challenge spec
└── Legal Agreement      ← separate read-only reference surface
```

This removes the legal document from the main escrow workflow while still keeping it accessible for reference.

### 2. Move Legal out of the Finance Review tab
In `src/pages/cogniblend/FcFinanceWorkspacePage.tsx`:

- Remove `FcLegalDocsViewer` from the current **Finance Review** tab.
- Add a separate **Legal Agreement** tab or challenge-local side navigation item.
- Keep it read-only and clearly labeled as:
  - “Reference only”
  - “Approved by Legal Coordinator”

Recommended implementation for this pass:
- Use a **third tab** (`escrow`, `challenge`, `legal`) rather than a global shell sidebar item.
- Reason: it fits the current route model, avoids app-shell complexity, and stays within the existing per-challenge workspace pattern.

### 3. Rename “Finance Review” to “Escrow Review”
Update copy so the FC sees the actual task immediately.

Tab labels:
- `Escrow Review`
- `Curated Challenge`
- `Legal Agreement`

This will align the screen with what FC is expected to do.

### 4. Make escrow information the first-class content
Inside the new **Escrow Review** tab, render in this order:

1. **Escrow status card**
   - Pending / Funded / Submitted
   - Amount expected
   - Governance note: “Mandatory for Controlled”

2. **RecommendedEscrowCard**
   - reward breakdown
   - total expected amount
   - curator/creator notes if present

3. **Escrow deposit form**
   - bank name
   - branch
   - bank address
   - currency
   - deposited amount
   - deposit date
   - transaction reference
   - account number
   - IFSC/SWIFT
   - proof upload
   - FC notes

4. **Read-only funded summary** after confirmation

### 5. Fix the missing-form behavior for FC preview mode
Current behavior fully hides the form before Phase 3, which makes FC feel blocked without context.

Refine the behavior:

#### Before Phase 3
Show:
- Escrow status card
- Recommended escrow context
- The full bank/deposit form in **read-only or disabled preview mode**
- Clear banner:
  - “You can prepare escrow details now. Submission unlocks at Phase 3.”

Do **not** allow final mutation yet if lifecycle rules must remain intact.

#### At Phase 3
Enable:
- all fields
- proof upload
- confirm escrow deposit
- submit financial review footer

This preserves the business rule while solving the UX problem of “nothing is visible”.

### 6. Prepopulate the form from any existing escrow record
Right now `useFcEscrowConfirm` initializes blank defaults and does not hydrate from `escrowData`.

Refine so that if an `escrow_records` row already exists, the form loads:
- bank_name
- bank_branch
- bank_address
- currency
- deposit_amount
- deposit_date
- deposit_reference
- fc_notes
- masked account reference if available
- IFSC/SWIFT if available

This ensures FC sees stored escrow details instead of a blank screen.

### 7. Align data fetching with architecture rules
There is still a layering mismatch:

- `FcLegalDocsViewer` performs Supabase access directly in a component.
- FC workspace orchestration is page-heavy.

Refactor to:
- move legal doc query into a hook/service
- keep page as composition only
- keep each file under 250 lines
- keep zero `any`

### 8. Add the missing mandatory UI states for the FC workspace
The FC workspace needs explicit:
- loading skeletons
- empty legal-reference state
- escrow-not-yet-created state
- error state with retry + correlation ID
- success/read-only funded state

Especially for **Escrow Review**, there should be a clear empty state:
- “No escrow record yet”
- “Enter bank and deposit details to prepare the finance review”

## Files to update

### Modify
- `src/pages/cogniblend/FcFinanceWorkspacePage.tsx`
  - restructure tabs
  - remove legal viewer from main FC task area
  - rename Finance Review → Escrow Review
  - show preview-mode escrow form shell

- `src/pages/cogniblend/EscrowDepositForm.tsx`
  - support disabled/read-only preview mode
  - support hydration from existing escrow values
  - improve labels so FC understands these are escrow capture fields

- `src/hooks/cogniblend/useFcEscrowConfirm.ts`
  - initialize/reset from existing escrow record
  - separate “editable” vs “submit enabled” behavior
  - preserve Phase-3 submit gate

### Create / extract
- `src/hooks/cogniblend/useFcLegalAgreement.ts`
  - typed query for UNIFIED_SPA

- `src/components/cogniblend/fc/FcLegalAgreementTab.tsx`
  - read-only legal reference state

- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
  - escrow status + recommended card + form + funded summary

- optional small helper:
  - `src/services/cogniblend/fcFinanceWorkspaceViewService.ts`
  - derive preview/editability/status flags

## Expected UX after the change

On `/cogni/challenges/:id/finance`, FC will see:

### Escrow Review
- escrow amount/context first
- bank and escrow entry fields visible
- preview mode explains when submission unlocks
- once at Phase 3, form becomes actionable

### Curated Challenge
- full read-only challenge detail

### Legal Agreement
- separate read-only reference surface
- no longer mixed into the core FC task flow

## Business-rule posture

This plan keeps the current workflow guard intact:
- FC submission still only completes at Phase 3
- Legal remains reference-only for FC
- LC remains owner of legal approval
- FC remains owner of escrow confirmation and finance submission

## Verification

1. FC opens challenge finance workspace at Phase 2:
   - sees **Escrow Review**, **Curated Challenge**, **Legal Agreement**
   - sees escrow form fields visible but gated/disabled
   - legal no longer appears inside escrow flow

2. FC opens challenge at Phase 3:
   - escrow form becomes editable
   - bank/deposit/proof entry works
   - submit footer is enabled only after funded state

3. Existing funded challenge:
   - FC sees funded summary instead of blank form
   - legal remains separately accessible

4. No file exceeds 250 lines
5. No direct Supabase calls remain in FC presentation components
6. `npx tsc --noEmit` passes

## Out of scope

- Changing LC legal ownership or legal approval flow
- Moving challenge-specific legal reference into the global app shell sidebar
- Altering the `complete_financial_review` lifecycle rule
