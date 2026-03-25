

# Fix: Curator Must Be Able to Work While Legal & Finance Are Pending

## Problem

The `isReadOnly` flag on line 1623 of `CurationReviewPage.tsx` is:

```typescript
const isReadOnly = (challenge.current_phase ?? 0) < 3 || searchParams.get('mode') === 'view';
```

When a curator opens a Phase 3 challenge from the queue, if `?mode=view` is in the URL, **everything** becomes read-only — no editing, no AI review, no actions. Additionally, the `CurationActions` component shows "View-only mode — actions disabled until Legal & Finance review is complete" when `readOnly` is true.

**The correct behavior per governance rules:**
- Curator CAN edit all sections except `legal_docs` and `escrow_funding` (already handled by `LOCKED_SECTIONS`)
- Curator CAN run AI review on all sections
- Curator CANNOT submit to Innovation Director until both locked sections are accepted
- The submission gate (not the edit capability) is what should be blocked by legal/escrow status

## Root Cause

Two issues:
1. **`?mode=view` in URL forces blanket read-only** — even for Phase 3 curators who should be actively working
2. **`CurationActions` conflates "legal pending" with "read-only"** — it should disable only the Submit button, not show a blanket "actions disabled" message

## Changes

### 1. `src/pages/cogniblend/CurationReviewPage.tsx` (line 1623)

Separate true view-only (Phase 1/2 preview) from curator working mode:

```typescript
// True read-only: only when viewing a challenge NOT in curation phase
const isReadOnly = (challenge.current_phase ?? 0) < 3;
// mode=view should NOT override Phase 3 curator access
```

Remove `searchParams.get('mode') === 'view'` from `isReadOnly`. If the challenge is Phase 3+, the curator must be able to work regardless of URL params.

Also update the queue navigation in `CurationQueuePage.tsx` — Phase 3 challenges should never get `?mode=view` appended (currently they don't, but confirm no other entry points add it).

### 2. `src/components/cogniblend/curation/CurationActions.tsx`

Replace the blanket "View-only mode" message with targeted submission blocking:

- Remove the `readOnly` banner that says "actions disabled until Legal & Finance review is complete"
- Instead, keep Submit to Innovation Director button always visible but **disabled** when `legal_docs` or `escrow_funding` are not accepted
- Show a specific tooltip/message on the disabled Submit button: "Legal Documents and Escrow & Funding must both be accepted before submitting"
- Return for Modification, Hold/Resume, and AI Quality analysis should work normally regardless of legal/escrow status

### 3. `src/pages/cogniblend/CurationReviewPage.tsx` — CurationActions props

Pass `readOnly={isReadOnly}` (which now only triggers for Phase < 3). Add a new prop like `legalEscrowBlocked` (derived from `approvedSections`) so the Submit button knows to block independently of read-only mode.

## Files to modify

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove `mode=view` from `isReadOnly` formula; pass `legalEscrowBlocked` prop to CurationActions |
| `src/components/cogniblend/curation/CurationActions.tsx` | Replace blanket read-only banner with targeted Submit-only block when legal/escrow not accepted; accept new `legalEscrowBlocked` prop |

## What stays the same
- `LOCKED_SECTIONS` still prevents editing legal_docs and escrow_funding content
- Phase 1/2 challenges remain truly read-only
- Checklist validation still gates submission
- `complete_phase` SQL function still hard-blocks if sections not accepted

