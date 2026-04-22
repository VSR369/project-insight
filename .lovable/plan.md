
## Continue plan — Phase 4 onward, consuming the completed installment backend without breaking current flows

## Current implementation baseline to preserve
The backend foundation is already in place and should be treated as the source of truth:
- `escrow_installments` table, constraints, indexes, and RLS exist
- aggregate helpers exist:
  - `challenge_escrow_installments_funded`
  - `sync_escrow_record_from_installments`
- completion RPCs are installment-aware:
  - `complete_curator_compliance`
  - `complete_financial_review`
- normalization + aggregate services already exist:
  - `escrowInstallmentTypes.ts`
  - `escrowInstallmentNormalizationService.ts`
  - `escrowInstallmentAggregateService.ts`

The remaining work is frontend/domain integration only.

## Architecture corrections to apply while continuing
1. No direct Supabase calls in components
- `CuratorComplianceTab.tsx` currently calls `supabase.rpc('seed_default_legal_docs', ...)` directly.
- While implementing installment hooks, move that call behind a hook/service so the file complies with Lovable layer rules.

2. Keep legacy `escrow_records` support
- Do not break existing single-row escrow screens.
- New installment UI must fall back cleanly when no installment rows exist.

3. Keep files under 250 lines
- Shared escrow UI must be decomposed into small feature components and hooks.

## Phase 4 — Build missing installment hooks and service validation

### 4.1 Add governance validation services
Create:
- `src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts`
- `src/services/cogniblend/escrowInstallments/escrowInstallmentAccessService.ts`

Responsibilities:
- enforce governance to funding-role match:
  - STRUCTURED → only `CU`
  - CONTROLLED → only `FC`
- enforce only pending installments are actionable
- enforce funded installments are immutable
- enforce exact linkage between selected installment and deposit amount
- enforce proof requirement before marking `FUNDED`
- expose pure helpers for:
  - `canSeedInstallments`
  - `canFundInstallment`
  - `canCompleteEscrowPath`
  - `isLegacyEscrowOnly`

### 4.2 Add installment query/mutation hooks
Create:
- `src/hooks/cogniblend/useEscrowInstallments.ts`
- `src/hooks/cogniblend/useSeedEscrowInstallments.ts`
- `src/hooks/cogniblend/useEscrowFundingContext.ts`
- `src/hooks/cogniblend/useEscrowInstallmentFunding.ts`

Hook behavior:
- `useEscrowInstallments`
  - fetch `escrow_installments` by `challenge_id`
  - order by `installment_number`
- `useSeedEscrowInstallments`
  - read `reward_structure.payment_mode` + `payment_milestones`
  - if escrow applies and installment rows do not exist, seed:
    - milestones-driven rows
    - or one 100% row when milestones are empty
  - must be idempotent
- `useEscrowFundingContext`
  - load challenge funding context in one hook:
    - challenge governance
    - creator escrow comments
    - extended brief escrow notes
    - normalized schedule
    - existing installments
    - aggregate summary
    - legacy `escrow_records` fallback
- `useEscrowInstallmentFunding`
  - shared mutation used by both FC and Curator paths
  - handles proof upload
  - writes installment row updates
  - calls header sync via existing DB function
  - invalidates:
    - installment list
    - funding context
    - preview
    - workspace detail
    - readiness/compliance queries

### 4.3 Refactor existing hooks onto the new model
Refactor:
- `useFcEscrowConfirm.ts`
  - stop writing directly to `escrow_records`
  - become wrapper around `useEscrowInstallmentFunding` for `fundingRole='FC'`
  - keep legacy mode only if no installment rows exist
- `useFcFinanceSubmit.ts`
  - keep RPC call
  - stop depending on challenge-wide single-record mental model
  - gate UX off aggregate installment completion
- `useEscrowDeposit.ts`
  - reposition as legacy/header compatibility hook
  - do not use it as the primary source for new installment UI

## Phase 5 — Build shared installment UI components

Create a new feature folder:
`src/components/cogniblend/escrow/`

Files:
- `EscrowInstallmentWorkspace.tsx`
- `EscrowInstallmentContextCard.tsx`
- `EscrowInstallmentTable.tsx`
- `EscrowFundingForm.tsx`
- `EscrowInstallmentSummary.tsx`
- `EscrowLegacySummary.tsx`
- optional small state components if needed:
  - `EscrowInstallmentSkeleton.tsx`
  - `EscrowInstallmentEmptyState.tsx`
  - `EscrowInstallmentErrorState.tsx`

### Shared workspace contract
`EscrowInstallmentWorkspace` must accept:
- `challengeId`
- `governanceMode`
- `fundingRole: 'CU' | 'FC'`
- `isReadOnly`
- `canSubmitPath`
- completion callback
- context data
- funding mutation handlers

### Shared UX rules
- top: context card
  - governance mode
  - creator escrow comments
  - extended-brief escrow notes
  - reward total / currency
- middle: installment schedule table
  - number
  - label
  - trigger
  - pct
  - scheduled amount
  - status
  - funded by role
- bottom/right: funding form for selected pending installment only
- funded rows:
  - read-only
  - never reopen for edit
- pending rows:
  - selectable
  - form prefilled from selected installment
- no free-form installment number entry
- amount is locked to selected installment scheduled amount
- legacy row-only challenges:
  - render `EscrowLegacySummary`

### Required states
For every new data-driven component:
- loading skeleton
- empty state
- error state with retry
- success state

## Phase 6 — Replace FC single-record UX with installment workspace

### Update FC page flow
Refactor:
- `src/pages/cogniblend/FcFinanceWorkspacePage.tsx`
- `src/components/cogniblend/fc/FcEscrowReviewTab.tsx`
- `src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx`

### FC path behavior
For CONTROLLED:
- use `useEscrowFundingContext`
- auto-seed installments on workspace load
- replace `EscrowDepositForm` with shared `EscrowInstallmentWorkspace`
- pass `fundingRole="FC"`
- show authored schedule as read-only context
- allow FC to fund only pending installments
- keep submit footer disabled until aggregate status is fully funded
- preserve existing legal tab and challenge tab

### FC copy updates
Replace outdated single-record language:
- “FC Deposit Record”
- “No escrow record yet”
- “Create the FC deposit record”

With installment-aware language:
- “Escrow schedule”
- “Select a pending installment to confirm funding”
- “Funding is captured per installment and linked to bank/proof details”

## Phase 7 — Add STRUCTURED Curator installment workspace

### Update Curator flow
Refactor:
- `src/components/cogniblend/curation/CuratorComplianceTab.tsx`
- `src/components/cogniblend/curation/renderers/StructuredFieldsSectionRenderer.tsx`
- `src/components/cogniblend/curation/renderers/renderOpsSections.tsx`

### Curator path behavior
For STRUCTURED:
- use same `useEscrowFundingContext`
- auto-seed installments on first finance tab open
- render shared `EscrowInstallmentWorkspace`
- pass `fundingRole="CU"`
- Curator funds installments directly
- completion button stays wired to `useCompleteCuratorCompliance`
- submit remains disabled until installment aggregate is fully funded

### Curator compliance correction
Also refactor legal-doc seeding out of `CuratorComplianceTab` component into a hook/service wrapper so the component no longer imports Supabase directly.

## Phase 8 — Fix governance-aware section attribution and routing

### Update section ownership
Refactor:
- `src/components/cogniblend/curation/SectionPanelItem.tsx`
- `src/lib/cogniblend/curationSectionDefs.tsx`
- any send-to-coordinator helpers touching `escrow_funding`

Required changes:
- `escrow_funding` attribution must become governance-aware
  - STRUCTURED → `CU`
  - CONTROLLED → `FC`
- `SectionPanelItem` must stop hardcoding `escrow_funding -> FC`
- `curationSectionDefs.tsx` must stop labeling escrow as always “by FC”
- readiness, AI review send-to-coordinator, and locked-section routing must use the resolved governance role

### Update renderer path
`renderOpsSections.tsx` should stop treating escrow as a static structured read-only block.
- STRUCTURED: render Curator installment workspace or installment summary entry point
- CONTROLLED in curation surfaces: render read-only summary, not editable Curator controls

## Phase 10 — Update downstream read-only surfaces to consume installment context

### Refactor FC/Curator context card
Update `src/components/cogniblend/fc/RecommendedEscrowCard.tsx`
- stop treating `extended_brief.recommended_escrow_amount` as primary source
- read schedule from `reward_structure.payment_milestones`
- include empty-milestone fallback as one 100% installment
- show creator escrow comments and notes as context only
- show aggregate funded/pending summary when installments exist

### Update preview data loader
Refactor `src/components/cogniblend/preview/usePreviewData.ts`
- load `escrow_installments`
- compute installment aggregate summary
- expose both:
  - installment list / summary
  - legacy escrow record
- preserve current challenge/legal/digest/attachments behavior

### Update preview rendering
Refactor:
- `src/components/cogniblend/preview/PreviewEscrowSection.tsx`
- `src/components/cogniblend/curation/EscrowStatusCard.tsx`

Required behavior:
- QUICK: hidden / not required messaging
- STRUCTURED:
  - show Curator-funded installment progress
- CONTROLLED:
  - show FC-funded installment progress
- if no installments but legacy header exists:
  - render legacy summary
- if installments exist:
  - show funded count, pending count, total funded, and row-level summaries

## Phase 11 — Explicit legacy fallback support

Legacy compatibility must be implemented in UI, not assumed.

### Legacy rules
If:
- `escrow_records` exists
- and `escrow_installments` is empty

Then:
- FC workspace renders `EscrowLegacySummary`
- Curator/preview surfaces render legacy read-only summary
- submit behavior continues to rely on existing RPC fallback already implemented in the database

### Non-legacy rules
If installment rows exist:
- installment model is authoritative
- single-row deposit form must not be shown

## Recommended implementation order
1. Add validation/access services
2. Add installment query + seeding + funding hooks
3. Build shared installment UI components
4. Replace FC escrow tab with shared workspace
5. Replace STRUCTURED Curator finance tab with shared workspace
6. Fix governance-aware section ownership/routing
7. Update preview/read-only surfaces
8. Add explicit legacy fallback rendering
9. Run TS and UI regression pass across FC, Curator, and preview routes

## Files to create
```text
src/services/cogniblend/escrowInstallments/escrowInstallmentValidationService.ts
src/services/cogniblend/escrowInstallments/escrowInstallmentAccessService.ts

src/hooks/cogniblend/useEscrowInstallments.ts
src/hooks/cogniblend/useSeedEscrowInstallments.ts
src/hooks/cogniblend/useEscrowFundingContext.ts
src/hooks/cogniblend/useEscrowInstallmentFunding.ts

src/components/cogniblend/escrow/EscrowInstallmentWorkspace.tsx
src/components/cogniblend/escrow/EscrowInstallmentContextCard.tsx
src/components/cogniblend/escrow/EscrowInstallmentTable.tsx
src/components/cogniblend/escrow/EscrowFundingForm.tsx
src/components/cogniblend/escrow/EscrowInstallmentSummary.tsx
src/components/cogniblend/escrow/EscrowLegacySummary.tsx
```

## Files to refactor
```text
src/hooks/cogniblend/useFcEscrowConfirm.ts
src/hooks/cogniblend/useFcFinanceSubmit.ts
src/hooks/cogniblend/useEscrowDeposit.ts

src/pages/cogniblend/FcFinanceWorkspacePage.tsx
src/components/cogniblend/fc/FcEscrowReviewTab.tsx
src/components/cogniblend/fc/FcFinanceSubmitFooter.tsx
src/components/cogniblend/fc/RecommendedEscrowCard.tsx

src/components/cogniblend/curation/CuratorComplianceTab.tsx
src/components/cogniblend/curation/renderers/StructuredFieldsSectionRenderer.tsx
src/components/cogniblend/curation/renderers/renderOpsSections.tsx
src/components/cogniblend/curation/SectionPanelItem.tsx
src/lib/cogniblend/curationSectionDefs.tsx

src/components/cogniblend/preview/usePreviewData.ts
src/components/cogniblend/preview/PreviewEscrowSection.tsx
src/components/cogniblend/curation/EscrowStatusCard.tsx
```

## Acceptance criteria
1. FC workspace no longer renders the old single-record escrow form for installment-enabled challenges
2. Curator finance tab in STRUCTURED mode renders the shared installment workspace
3. Installments auto-seed from `payment_milestones`, or one 100% installment when milestones are empty
4. Only pending installments are fundable
5. Funded installments become immutable
6. `funded_by_role` is enforced by governance path in service validation
7. Section ownership for `escrow_funding` is governance-aware
8. Preview and curator summaries show installment progress
9. Legacy single-row escrow challenges still render safely
10. No component imports Supabase directly for installment logic
11. All new files remain under 250 lines
12. No `any`
13. Existing RPC-based completion flow remains intact

## Final execution directive
Continue from Phase 4 forward only. The database/RPC foundation is correct and should now be consumed by hooks, shared installment components, FC integration, Curator integration, governance-aware routing, and preview/read-only updates.
