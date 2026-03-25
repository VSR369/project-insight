

# Fix: Curator Must Work Freely — Only Submission Is Gated

## What's wrong now

Three separate issues are blocking the curator from working:

1. **`isReadOnly` guards hide AI buttons** — Lines 2441 and 2485 wrap "AI Quality Analyze" and "Review Sections by AI" in `{!isReadOnly && ...}`. When `isReadOnly` is true (Phase < 3, or legacy `?mode=view`), these buttons vanish entirely. Even for Phase 3 curators, the current URL has `?mode=view` which was only recently removed from the `isReadOnly` formula but may still be present in navigation links.

2. **`legalEscrowBlocked` is hardcoded to require BOTH sections** — Line 1632: `const legalEscrowBlocked = !isLegalAccepted || !isEscrowAccepted`. This ignores governance rules:
   - **Escrow** is only required for `CONTROLLED` mode (already handled in checklist item 15 and escrow renderer)
   - **Legal docs** depend on the `lc_review_required` flag on the challenge
   - For `QUICK` or `STRUCTURED` governance, these sections may be automatically satisfied

3. **`CurationActions` hides ALL action buttons when `readOnly`** — Line 380: `{!readOnly && (...)` wraps Submit, Return, and all action buttons. Phase 1/2 preview should still show AI buttons.

## Plan

### 1. Always show AI buttons (remove `isReadOnly` guards)

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

- **Line 2441**: Remove `{!isReadOnly && (` wrapper from AI Quality "Analyze" button
- **Line 2485**: Remove `{!isReadOnly && (` wrapper from "Review Sections by AI" button

These are read-only operations (call edge functions, store results). No governance reason to hide them.

### 2. Make `legalEscrowBlocked` governance-aware

**File: `src/pages/cogniblend/CurationReviewPage.tsx`** (around line 1625-1632)

Replace the hardcoded logic:

```typescript
// Current (wrong):
const legalEscrowBlocked = !isLegalAccepted || !isEscrowAccepted;

// Fix (governance-aware):
const isControlled = isControlledMode(resolveGovernanceMode(challenge.governance_profile));
const needsLegalAcceptance = challenge.lc_review_required || legalDetails.length > 0;
const needsEscrowAcceptance = isControlled;

const legalEscrowBlocked =
  (needsLegalAcceptance && !isLegalAccepted) ||
  (needsEscrowAcceptance && !isEscrowAccepted);
```

This means:
- **QUICK** challenges with no legal docs and no `lc_review_required` → not blocked
- **STRUCTURED** challenges with `lc_review_required` → legal must be accepted
- **CONTROLLED** challenges → both legal AND escrow must be accepted

### 3. Update the amber notice in CurationActions to be specific

**File: `src/components/cogniblend/curation/CurationActions.tsx`**

Pass the blocking detail as a prop (or compute from existing props). Change the amber notice from the generic "Legal Documents and Escrow & Funding must both be accepted" to show only what's actually blocking:

- Add optional `blockingReason` string prop (computed in parent)
- Display it in the amber notice instead of the hardcoded message
- Examples: "Legal Documents must be accepted before submitting", "Escrow & Funding must be accepted before submitting", or both

### 4. Never hide action buttons for Phase 3+ curators

**File: `src/components/cogniblend/curation/CurationActions.tsx`**

The `{!readOnly && (` guard at line 380 is correct — it prevents Phase 1/2 viewers from seeing Submit/Return buttons. No change needed here since `isReadOnly` is now Phase-only.

But confirm: the `readOnly` banner (line 333) should also clarify that AI review IS available. Update the message to: "Preview mode — editing and submission disabled. AI review is available."

---

## Files to modify

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove `!isReadOnly` guards from AI buttons (lines 2441, 2485); make `legalEscrowBlocked` governance-aware; compute `blockingReason` string |
| `src/components/cogniblend/curation/CurationActions.tsx` | Accept `blockingReason` prop; update amber notice; update read-only banner text |

## What stays the same
- `LOCKED_SECTIONS` still prevents editing legal_docs / escrow_funding content
- Phase 1/2 viewers cannot submit or return challenges
- `complete_phase` SQL function still validates at DB level
- Checklist items 11-12 (legal docs) and 15 (escrow) already use governance-aware logic

