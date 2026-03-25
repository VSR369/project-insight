
Goal
Make Curator workspace fully operational for editing + AI review in all curation queue states, while blocking only phase submission when Legal/FC acceptance is required by governance rules.

Critical analysis (current break)
1) `CurationReviewPage.tsx` still sets `isReadOnly = (challenge.current_phase ?? 0) < 3`, which disables all section editors (except locked-section AI comments) for Phase 1/2 items.
2) `CurationQueuePage.tsx` still routes Phase 1/2 with `?mode=view`, reinforcing preview behavior.
3) `CurationActions.tsx` has an extra hard gate `isLegalPending` that blocks submit independently of governance-aware `legalEscrowBlocked`, causing over-blocking.
4) Your format-native system (table/line/radio/checkbox/master-data/rich text) and AI batch review are still present; the issue is access gating, not renderer removal.

Implementation plan

1) Remove phase-based read-only from curator editing
- File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Replace phase-derived `isReadOnly` with curator-edit mode for this screen (always editable for unlocked sections).
- Keep section-level locking strictly via `LOCKED_SECTIONS` (legal_docs, escrow_funding).
- Update all `canEdit` and renderer `readOnly` props to depend on lock status (not phase status).
- Keep AI buttons always visible (already done) and keep existing AI chunked review flow unchanged.

2) Keep submission gating only (not workspace gating)
- File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Retain governance-aware calculation:
  - Legal required only when `lc_review_required` or legal docs exist.
  - Escrow required only for `CONTROLLED`.
- Continue passing `legalEscrowBlocked` + specific `blockingReason` to actions.
- Remove “view-only” page framing (title/badge/banner) that currently implies disabled workspace.

3) Remove non-governance hard block in submit action
- File: `src/components/cogniblend/curation/CurationActions.tsx`
- Remove `isLegalPending` from:
  - `handleSubmitClick()` early-return block
  - Submit button `disabled` expression
- Submission should be blocked by:
  - `legalEscrowBlocked`
  - checklist incompletion
  - outstanding required modification points
  - pending mutation states
- Keep amber message specific to `blockingReason`.

4) Stop forcing preview navigation from queue
- File: `src/pages/cogniblend/CurationQueuePage.tsx`
- Remove `?mode=view` injection in `handleRowClick`.
- Keep Incoming tab semantics, but do not imply immutable preview mode through routing.
- Optional text tweak: incoming tooltip should say “upstream inputs pending; curator can continue refinement, submission remains gated.”

5) Preserve all UX/format work explicitly (no regressions)
- No changes to:
  - `curationSectionFormats.ts` format map
  - format-native renderers (table/line/radio/checkbox/select/date/tag/rich text/schedule)
  - master-data constrained selection behavior
  - `review-challenge-sections` batch/chunk AI review flow
  - AI inline refine/incorporate mechanics

Validation checklist (end-to-end)
1) Open Phase 1/2/3 challenge as Curator from queue:
- All unlocked sections can edit/save.
- Legal/Escrow remain content-locked.
2) “Review Sections by AI” works across all sections and writes results.
3) “AI Quality Analyze” runs successfully.
4) For QUICK/STRUCTURED without legal requirement:
- Submit not blocked by Legal/Escrow.
5) For CONTROLLED or legal-required cases:
- Submit disabled with precise blocking reason.
6) After Legal/Escrow acceptance where required:
- Submit enabled and phase transition works.
7) Confirm no regressions in Phase Schedule table edit flow and rich-text integration.

Files to modify
- `src/pages/cogniblend/CurationReviewPage.tsx`
- `src/components/cogniblend/curation/CurationActions.tsx`
- `src/pages/cogniblend/CurationQueuePage.tsx`
