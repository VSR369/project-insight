

# Plan — S7 Workflow & Visibility Sprint (Lovable-aligned)

Closes the 11 gaps you listed. Execution order: **S7C → S7A → S7B → S7D**. S7C is the critical path (workflow); S7A/B fix visibility; S7D adds guards and gates the publish button. Every change reuses existing components and stays inside the workspace rules (≤250 lines/file, no DB calls in components, hooks call services, RLS preserved).

---

## S7C — Workflow Fixes (CRITICAL — Gaps 7, 8) — ~2 days

The current `complete_legal_review` / `complete_financial_review` RPCs jump *straight to Phase 4* once both compliance flags are true. There is **no Creator approval pause**, and the Creator's `acceptAll` mutation only flips a column — it never moves the phase forward. Result: challenges silently hang.

### S7C-1 — New migration: insert a Creator-approval pause between Phase 3 and Phase 4

New migration `<ts>_creator_approval_pause.sql`:

1. **Helper RPC** `public.request_creator_approval(p_challenge_id uuid, p_user_id uuid)` (SECURITY DEFINER, `search_path = public`):
   - Pre-conditions: `lc_compliance_complete = true` AND `fc_compliance_complete = true` AND `creator_approval_status` IS DISTINCT FROM `'pending'`/`'approved'`.
   - Sets `creator_approval_status = 'pending'`, `creator_approval_requested_at = now()`, `phase_status = 'CR_APPROVAL_PENDING'`.
   - Inserts `audit_trail` row + status-history row (`PENDING_LC_REVIEW` → `PENDING_CREATOR_APPROVAL`).
   - Inserts `notifications` rows for active CR users on the challenge (deep-link `/cogni/challenges/{id}/creator-review`).

2. **Modify `complete_legal_review` and `complete_financial_review`** (`CREATE OR REPLACE`):
   - Today: when *both* flags become true → call `complete_phase` → goes to Phase 4.
   - New behaviour: when both flags are true → call `request_creator_approval` instead. **Phase stays at 3.** Return `{ success:true, phase_advanced:false, awaiting:'creator_approval' }`.
   - Idempotent: if already `'pending'` or `'approved'`, no-op succeed.

3. **New RPC** `public.creator_finalize_approval(p_challenge_id, p_user_id, p_decision text)` where `p_decision IN ('approved','changes_requested')`:
   - Validates caller has `CR` role on the challenge.
   - On `'approved'`: sets `creator_approval_status='approved'`, `creator_approved_at=now()`, `phase_status='READY_TO_PUBLISH'`, then calls `public.complete_phase(...)` to advance to Phase 4 (Publication). Inserts notifications for CU.
   - On `'changes_requested'`: sets `creator_approval_status='changes_requested'`, `phase_status='CR_CHANGES_REQUESTED'`, `pass3_stale=true`. Notifies CU + LC. Phase stays at 3.

4. **One-shot backfill**: for any challenge currently stuck with `lc_compliance_complete = true AND fc_compliance_complete = true AND current_phase = 3 AND creator_approval_status IS NULL` → call `request_creator_approval` so existing test data lights up.

### S7C-2 — Wire UI to the new RPCs

- `useCreatorReview.ts` (existing): replace the `acceptAll` mutation body — call `creator_finalize_approval(p_decision:'approved')` (single RPC) instead of the direct `update`. Replace `requestRecuration` similarly with `p_decision:'changes_requested'`. Removes the orphaned "approved but stuck" state automatically.
- `EscrowManagementPage.tsx`: success toast becomes "Escrow confirmed — Creator approval requested" when the RPC returns `awaiting:'creator_approval'`.
- `LcLegalWorkspacePage.tsx`: same — success toast updated, no behaviour change beyond messaging.

**No application logic moves into the components — all branching stays in the hook/RPC layer.**

---

## S7A — LC Visibility (Gaps 1, 2, 3) — ~3.5 days

LC currently sees a 6-section accordion with no references and no template content. Reuse the **existing PreviewDocument** that Curator/Creator already share — single source of truth.

### S7A-1 — Promote `useChallengeForLC` to full-fidelity loader

- `src/hooks/cogniblend/useLcLegalData.ts`: replace the narrow `useChallengeForLC` with a thin wrapper around `usePreviewData(challengeId)`. We get challenge + org + legal + escrow + digest + attachments + field rules in one place — same data the Curator/Creator preview already use. No new query duplication.
- Keep the old `LcChallenge` typed export as an alias for `ChallengeData` so non-Pass-3 callers don't break.

### S7A-2 — Replace `LcChallengeDetailsCard` with the read-only Preview

- New thin component `src/components/cogniblend/lc/LcFullChallengePreview.tsx` (<150 lines): renders `<PreviewDocument …>` with `canEditSection={() => false}` and `isGlobalReadOnly={true}`. Wraps in a Card with a "Curated Challenge — Read Only" header and a collapse toggle (defaults to expanded for LC).
- `LcLegalWorkspacePage.tsx` swaps `<LcChallengeDetailsCard>` → `<LcFullChallengePreview>`. All 33 sections, references, attachments, digest, org context become visible. The page stays a thin orchestrator.
- Old `LcChallengeDetailsCard.tsx` is deleted (no other callers).

### S7A-3 — Document content viewer in `LcAttachedDocsCard`

- Add a "View content" expand button per row.
- Lazy hook `useLegalDocContent(docId)` (in `useLcLegalData.ts`) fetches `content_html` / `ai_modified_content_html` on demand.
- Render via the existing `LegalDocumentViewer` component (already contract-styled).
- Same pattern reused for original platform/org templates that were auto-attached in Phase 2→3 — they're already in `challenge_legal_docs` rows, just hidden behind no UI.

---

## S7B — FC Visibility (Gaps 4, 5, 6) — ~3.5 days

### S7B-1 — Full curated-challenge preview on FC page

- New component `src/components/cogniblend/fc/FcChallengeDetailView.tsx` (<150 lines): wraps `PreviewDocument` read-only, exactly like `LcFullChallengePreview` (zero duplication of section logic).
- `EscrowManagementPage.tsx`: when a row is `isSelected`, render `<FcChallengeDetailView challengeId>` *above* `EscrowDepositForm` inside a collapsible Card. LC-approved legal docs already render inside `PreviewLegalSection` — FC sees them automatically.

### S7B-2 — Recommended-escrow context card

- New `src/components/cogniblend/fc/RecommendedEscrowCard.tsx`: reads from `usePreviewData` (already needed for S7B-1). Surfaces:
  - Governance mode + engagement model badges (reuse `GovernanceProfileBadge` + `EscrowModeBanner`).
  - Reward breakdown (platinum/gold/silver from `reward_structure`).
  - Curator/Creator notes from `extended_brief.escrow_notes` + `extended_brief.recommended_escrow_amount` (read-only).
  - Currency + rate-card hint pulled from existing `EscrowCalculationDisplay`.
- Renders directly above the deposit form. No schema change required (fields already exist in `extended_brief`).

### S7B-3 — Mode-aware guidance text on the form

- `EscrowDepositForm.tsx`: accept an optional `governanceMode` prop. Switch banner copy: CONTROLLED ⇒ "Mandatory — challenge cannot publish until escrow funded"; STRUCTURED ⇒ "Optional — Creator opted to fund"; QUICK ⇒ form not shown at all (already filtered upstream).

---

## S7D — Guards, Curator Visibility, Publication Gate (Gaps 9, 10, 11) — ~2.5 days

### S7D-1 — Read-only banners after compliance

- `LcLegalWorkspacePage.tsx`: when `challenge.lc_compliance_complete === true`, render a "Legal Review Complete — Read Only" banner via existing `Alert` and pass `isReadOnly` down to `LcPass3ReviewPanel` and `LcAiSuggestionsSection` (both already accept disabled flags). All edit/submit buttons disabled.
- `EscrowManagementPage.tsx`: when row's escrow `escrow_status === 'FUNDED'`, the form is already hidden — add an explicit "Escrow Confirmed" banner card above the row.

### S7D-2 — Curator visibility of LC/FC results

- `CurationReviewPage.tsx`: add two summary cards in `CurationRightRail` (or below it) — `LegalDocsSummaryCard` and `EscrowStatusCard`. Both pull from `usePreviewData` and render read-only when `lc_compliance_complete` / `fc_compliance_complete` is true. Curator sees attached docs (with view-content) and escrow snapshot exactly as Creator/LC see them.
- Same components reused: `PreviewLegalSection` and `PreviewEscrowSection`.

### S7D-3 — Tighten publication gate

- `usePublicationReadiness.ts`: extend the `select(...)` to include `creator_approval_status`, `pass3_stale`. Add two checks to the returned `checks[]`:
  - `creator_approval_status === 'approved'` ⇒ "Creator approval received".
  - `pass3_stale === false` ⇒ "Pass 3 legal review up to date".
- `PublicationReadinessPage.tsx` automatically renders them — no other changes needed; `canPublish` already requires `allPassed`.

---

## Files touched

| Layer | New | Edited | Deleted |
|---|---|---|---|
| Migrations | `<ts>_creator_approval_pause.sql` (S7C-1) | — | — |
| Hooks | — | `useLcLegalData.ts`, `useCreatorReview.ts`, `usePublicationReadiness.ts` | — |
| LC components | `LcFullChallengePreview.tsx` | `LcAttachedDocsCard.tsx`, `LcLegalWorkspacePage.tsx` | `LcChallengeDetailsCard.tsx` |
| FC components | `FcChallengeDetailView.tsx`, `RecommendedEscrowCard.tsx` | `EscrowManagementPage.tsx`, `EscrowDepositForm.tsx` | — |
| Curator | `LegalDocsSummaryCard.tsx`, `EscrowStatusCard.tsx` | `CurationRightRail.tsx` | — |

All files stay <250 lines. No Supabase imports added to components. No RLS changes (the new RPCs are SECURITY DEFINER and validate roles internally, matching the existing complete_*_review pattern).

---

## What this does NOT touch

- AI Pass 1 / Pass 2 / autosave.
- `complete_phase`, `assemble_cpa`, `freeze_for_legal_review`, `unfreeze_for_recuration`.
- SPA / PWA gates, `useAudienceClassification`, login routing (already fixed last sprint).
- Legal Architecture V2 freeze-review-publish.
- Storage buckets and existing RLS policies.

---

## Test gates

1. **S7C** — Existing test challenge `25ca71a0…`: backfill flips it to `creator_approval_status='pending'`, Creator's MyChallenges shows "Review & Approve", `acceptAll` advances to Phase 4 and PublicationReadiness lights up.
2. **S7C** — Fresh CONTROLLED challenge: LC submits → no phase advance, FC funds → no phase advance, Creator approves → Phase 4. STRUCTURED behaves identically.
3. **S7A** — LC sees all 33 preview sections including extended_brief, references, digest; original templates' content readable.
4. **S7B** — FC sees full curated challenge above the form, recommended-escrow card, mode-aware guidance.
5. **S7D** — After LC approval the LC workspace shows read-only banner; after FC funding the FC page shows confirmed banner; Curator sees both summary cards on CurationReviewPage; PublicationReadinessPage now lists the two new gates and blocks publish until both pass.
6. **Regression** — Quick-mode challenges unaffected (no Creator pause: QUICK skips compliance phase entirely via `md_lifecycle_phase_config`).
7. **Regression** — Login/SPA/PWA flows unchanged.

