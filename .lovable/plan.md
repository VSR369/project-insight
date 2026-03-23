

# Governance-Aware Escrow Display for Curator View

## What's changing

The escrow section and checklist item #15 currently treat escrow as universally required. This fix makes them conditional on governance mode:

- **QUICK / STRUCTURED** → Escrow not required → auto-pass checklist, show "Not required" message
- **CONTROLLED** → Escrow mandatory → show current pending/funded states, checklist passes only when FUNDED

## File changes

### 1. `src/pages/cogniblend/CurationReviewPage.tsx`

**Import** `resolveGovernanceMode, isControlledMode` from `@/lib/governanceMode`.

**Section definition `escrow_funding`** (lines 374-411):
- `isFilled`: return `true` if mode is not CONTROLLED, otherwise keep existing `escrow_status === "FUNDED"` check
- `render`: if mode is not CONTROLLED, show green "Escrow not required for this governance mode" message; otherwise keep current funded/pending/missing logic

**`computeAutoChecks`** (line 750):
- Item #15: `isControlledMode(resolveGovernanceMode(challenge.governance_profile)) ? escrowRecord?.escrow_status === "FUNDED" : true`

### 2. `src/pages/cogniblend/CurationChecklistPanel.tsx`

**Auto-checks array** (line 280):
- Same governance-aware logic for item #15

**Checklist label** (line 300):
- Conditionally show "Escrow funding confirmed" (CONTROLLED) or "Escrow funding (not required)" (others)

Both files already have `governance_profile` available on the challenge object. No new props or queries needed.

