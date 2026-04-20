

# Plan — S9 (Revised) Workflow Realignment to Configuration

The 4 paths below are the **single source of truth**, derived from `md_lifecycle_phase_config` (Phase 3 owner) + `extended_brief.creator_approval_required` (gate after compliance). Engagement model only changes the Creator-approval gate; **it never changes who does compliance work** — that is governance-mode-driven.

## Canonical matrix (matches your corrections + DB config)

```text
┌──────────────────────────────┬───────────────────┬─────────────────────────────────┐
│ Engagement × Governance      │ Compliance owner  │ Creator approval before publish │
├──────────────────────────────┼───────────────────┼─────────────────────────────────┤
│ MP × STRUCTURED              │ Curator (CU)      │ Always required                 │
│ MP × CONTROLLED              │ LC + FC           │ Always required                 │
│ AGG × STRUCTURED             │ Curator (CU)      │ Only if Creator opted in        │
│ AGG × CONTROLLED             │ LC + FC           │ Only if Creator opted in        │
│ * × QUICK                    │ Auto (no humans)  │ Never                           │
└──────────────────────────────┴───────────────────┴─────────────────────────────────┘
```

Two universal invariants:
1. **Pack always returns to Curator first.** Creator never sees raw LC/FC output.
2. When Creator approval is skipped (AGG opt-out), Curator publishes directly after compliance — no Creator pause.

---

## S9R-A — Database migration `<ts>_workflow_realignment_v2.sql`

### A1. Replace `send_to_legal_review` with governance-aware routing
- Resolve `governance_mode` first; engagement model is read but only affects the post-compliance gate.
- **STRUCTURED** (any model): do **not** assign LC/FC. Set `cu_compliance_mode = true` on the challenge. Returns `{ awaiting: 'curator_compliance' }`.
- **CONTROLLED** (any model): assign LC and FC from the platform pool (current behaviour). Returns `{ awaiting: 'lc_fc_compliance' }`.
- Spec freeze + CPA assembly stays identical for both paths.
- Add `cu_compliance_mode boolean default false` column on `challenges` (additive, no breakage).

### A2. New RPC `complete_curator_compliance(p_challenge_id, p_user_id)` (STRUCTURED path)
- Validates caller has `CU` on the challenge AND `governance_mode = 'STRUCTURED'` AND `cu_compliance_mode = true`.
- Sets `lc_compliance_complete = true` AND `fc_compliance_complete = true` in one shot.
- Branches on `extended_brief.creator_approval_required`:
  - `true` → calls `request_creator_approval(...)` → status `'pending'`, phase stays at 3, Creator notified.
  - `false` (AGG only — MP always true, see A5) → calls `complete_phase(...)` → advances to Phase 4 (publication), Creator NOT notified.
- Idempotent.

### A3. Modify `complete_legal_review` and `complete_financial_review` (CONTROLLED path)
- Top-of-function guard: `RAISE EXCEPTION` if `governance_mode <> 'CONTROLLED'`. Forces STRUCTURED through `complete_curator_compliance`.
- When both flags true:
  - Set `creator_approval_status = 'pending_curator_review'` (new sub-state).
  - Set `phase_status = 'AWAITING_CURATOR_PACK_REVIEW'`.
  - Notify the **Curator** (NOT the Creator) — message: "Pack ready for your review and forwarding".
- This ensures LC/FC always hand back to Curator, never directly to Creator.

### A4. New RPC `curator_forward_pack_to_creator(p_challenge_id, p_user_id, p_notes)`
- Caller must be `CU`, `lc_complete AND fc_complete`, status `'pending_curator_review'`.
- Branches on `extended_brief.creator_approval_required`:
  - `true` (MP always; AGG when opted in) → set `creator_approval_status = 'pending'`, `phase_status = 'CR_APPROVAL_PENDING'`, notify Creator. Phase stays at 3.
  - `false` (AGG opt-out only) → call `complete_phase(...)` → advances to Phase 4 immediately, Creator not notified.
- Inserts `audit_trail` + status-history rows.
- Single canonical handoff point — Creator approval (or auto-publish) only ever happens through this RPC.

### A5. Enforce MP = always-Creator-approval at the data layer
- New `BEFORE INSERT OR UPDATE` trigger `trg_challenges_force_mp_creator_approval` on `challenges`:
  - If `operating_model = 'MP'` and `governance_mode IN ('STRUCTURED','CONTROLLED')`, force `extended_brief = jsonb_set(extended_brief, '{creator_approval_required}', 'true', true)`.
- Backfills the same in the migration.
- Means MP creators cannot opt out, AGG creators can.

### A6. Extend `creator_approval_status` CHECK
- Add `'pending_curator_review'` to the allowed list. Existing values (`not_required`, `pending`, `approved`, `changes_requested`) preserved.

### A7. Backfill running data
- For challenges currently at Phase 3 with STRUCTURED + LC/FC roles assigned: deactivate those `user_challenge_roles` rows (`is_active = false`, audit row `WORKFLOW_REALIGNMENT_REVOKE_STRUCTURED`), set `cu_compliance_mode = true`. Pool counters decremented.
- For challenges with both flags true and no `creator_approval_status` set: route them through `request_creator_approval` (or `pending_curator_review` for the CONTROLLED ones that haven't yet been picked up by Curator).

---

## S9R-B — UI changes (each file ≤250 lines, no Supabase imports)

### B1. Curator Compliance Tab (STRUCTURED path)
- New `src/components/cogniblend/curation/CuratorComplianceTab.tsx`: hosts the existing `LcFullChallengePreview` + `LcAttachedDocsCard` + `LcPass3ReviewPanel` + `RecommendedEscrowCard` + `EscrowDepositForm` inside the Curator's `CurationReviewPage`.
- Visible only when `governance_mode = 'STRUCTURED'` AND `cu_compliance_mode = true`.
- Submit button calls `useCompleteCuratorCompliance` → `complete_curator_compliance`.
- Reuses every component already built for LC/FC — zero duplicate render logic.

### B2. Curator Pack Review Panel (CONTROLLED path)
- New `src/components/cogniblend/curation/CuratorPackReviewPanel.tsx`: visible when `governance_mode = 'CONTROLLED'` AND `creator_approval_status = 'pending_curator_review'`.
- Shows read-only `LegalDocsSummaryCard` + `EscrowStatusCard` + Curator notes textarea + two buttons:
  - **Forward to Creator** (or **Forward & Auto-Publish** when AGG opt-out) → `useCuratorForwardPack`.
  - **Return to LC/FC** → existing `unfreeze_for_recuration` flow with audit reason.
- Button label adapts based on `extended_brief.creator_approval_required`.

### B3. LC / FC workspaces — STRUCTURED guard
- `LcLegalWorkspacePage` + `EscrowManagementPage`: top-of-page guard — if `governance_mode = 'STRUCTURED'`, render an empty-state "Not applicable for Structured governance — Curator handles compliance" with a back link. No queries fired.
- `LcChallengeQueuePage` + `FcChallengeQueuePage`: filter at query level on `governance_mode = 'CONTROLLED'`.
- Removes the Phase-3 phase-gate bug entirely (S8-1 absorbed): for CONTROLLED these pages already get challenges in Phase 3, and the submit button gate becomes `current_phase === compliancePhase` resolved from `md_lifecycle_phase_config`.

### B4. `LegalReviewPanel` (Curator right-rail)
- For STRUCTURED challenges, the "Send to Legal Review" button label becomes **"Open Compliance Tab"** and routes to the new B1 tab in the Curator workspace; the underlying `send_to_legal_review` RPC still fires once on first open (freeze + assemble), but no LC/FC is assigned.
- For CONTROLLED, behaviour unchanged — assigns LC/FC.

### B5. Creator opt-in toggle (`CreatorApprovalCard`)
- Disable the toggle when `operating_model = 'MP'` with helper text "Always required for Marketplace challenges".
- Enable for AGG with confirmation dialog when toggling OFF: "Curator will publish immediately after compliance — you will not see the final pack."

### B6. Notifications
- LC/FC submit (CONTROLLED) → Curator notified (NOT Creator).
- Curator forwards (any path with approval=true) → Creator notified.
- Curator submits compliance with `creator_approval_required=false` (AGG STRUCTURED) OR forwards with same flag (AGG CONTROLLED) → no Creator notification; CR + admins notified "Auto-published".

---

## S9R-C — Hook layer

| Hook | Change |
|---|---|
| `useSendToLegal` | Toast adapts to STRUCTURED ("Compliance assigned to you") vs CONTROLLED ("Routed to LC/FC"). |
| `useCompleteCuratorCompliance` (new) | Wraps `complete_curator_compliance` RPC. |
| `useCuratorForwardPack` (new) | Wraps `curator_forward_pack_to_creator`. |
| `useCreatorReview` | Guard: if `creator_approval_status = 'pending_curator_review'` show `CreatorPackPendingBanner` (Creator should not see approve buttons yet). Existing `acceptAll` / `requestRecuration` continue to call `creator_finalize_approval`. |
| `usePublicationReadiness` | Skip `creator_approval` gate when `creator_approval_required = false` AND status went `phase 3 → 4` via auto-publish. |
| `useLcLegalData`, `useEscrowChallenges`, `useLcChallengeQueue`, `useFcChallengeQueue` | Filter at query level on `governance_mode = 'CONTROLLED'`. |
| `useCompliancePhase` (new tiny selector) | Reads `md_lifecycle_phase_config` to return the compliance phase number for a given mode — used by submit-button gates. |

---

## S9R-D — Files touched

| New | Edited | Deleted |
|---|---|---|
| `<ts>_workflow_realignment_v2.sql` | `send_to_legal_review`, `complete_legal_review`, `complete_financial_review`, `request_creator_approval`, `creator_finalize_approval` (single migration) | — |
| `CuratorComplianceTab.tsx` | `CurationReviewPage.tsx`, `CurationRightRail.tsx`, `LegalReviewPanel.tsx` | — |
| `CuratorPackReviewPanel.tsx` | `LcLegalWorkspacePage.tsx`, `EscrowManagementPage.tsx`, `LcChallengeQueuePage.tsx`, `FcChallengeQueuePage.tsx` | — |
| `CreatorPackPendingBanner.tsx` | `useSendToLegal.ts`, `useCreatorReview.ts`, `usePublicationReadiness.ts`, `CreatorApprovalCard.tsx` | — |
| `useCompleteCuratorCompliance.ts`, `useCuratorForwardPack.ts`, `useCompliancePhase.ts` | `useLcLegalData.ts`, `useEscrowChallenges.ts` | — |

All files ≤250 lines. RPCs are SECURITY DEFINER, validate caller role internally, no RLS changes.

---

## Test gates

1. **MP × STRUCTURED**: Curator → Open Compliance Tab → Pass 3 + escrow → Submit → status `pending` → Creator approves → Phase 4. LC/FC queues empty for this challenge.
2. **MP × CONTROLLED**: Curator → Send to LC/FC → both submit → status `pending_curator_review` → Curator clicks Forward → Creator approves → Phase 4.
3. **AGG × STRUCTURED, opt-in ON**: same as test 1. Opt-in OFF: Submit → Phase 4 directly, no Creator notification.
4. **AGG × CONTROLLED, opt-in ON**: same as test 2. Opt-in OFF: Curator clicks Forward & Auto-Publish → Phase 4 directly.
5. **MP toggle disabled**: Creator UI cannot turn off `creator_approval_required` for MP. DB trigger forces it true even on direct UPDATE.
6. **QUICK**: untouched, still auto-completes Phase 3.
7. **Backfill**: existing STRUCTURED challenges with stale LC/FC role rows get those rows deactivated; `cu_compliance_mode` flipped true; appears in Curator's Compliance Tab on next visit.
8. **Phase-gate**: CONTROLLED Submit-to-Curation button enables in Phase 3 (current bug fixed via `useCompliancePhase`).

## Out of scope (untouched)

AI Pass 1/2, Legal Architecture V2 freeze + CPA assembly, QUICK auto-flow, solver audience segmentation, login routing, publication-to-providers logic, RLS policies.

