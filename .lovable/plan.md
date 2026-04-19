

## BRD v2.1 FINAL — Implementation Gap Analysis

**Overall verdict:** The BRD is **~95% implemented**. All P0 blockers (6 DB bugs), Pass 3 (Curator + LC), AGG Section 9 protection, Creator approval workflow, FC escrow, daily/hourly timeout enforcement, audit trail, and version history are live. A small set of **wiring / consistency / minor UX** gaps remain. None block functionality, but a few create user-experience friction.

---

### ✅ Verified PRESENT (no gaps)

| BRD Requirement | Evidence |
|---|---|
| 6 P0 DB bug fixes | `md_governance_mode_config`: STRUCTURED `ai_legal_review_enabled=true`, `escrow_mode='mandatory'` for CTRL, `legal_doc_mode='ai_review'` for CTRL. Phase 3 STRUCTURED `auto_complete=true`. `auto_assign_roles_on_creation` returns `['CR']` only for STRUCT/CTRL. |
| Pass 3 mandatory STRUCT + CTRL | `CuratorLegalReviewPanel` + `LcPass3ReviewPanel` mounted; V-CR-6 enforced in `CurationChecklistPanel` |
| Unified Solution Provider Agreement (11 sections) | `LEGAL_SECTIONS` constant + `Pass3SectionNavWrapper` |
| AGG Section 9 protection | `protectedHeadings = ['ANTI-DISINTERMEDIATION']` + ProseMirror `dispatchTransaction` guard |
| 15-source AI context | `pass3Handler.ts` with `buildUnifiedContext` + tier resolution |
| `ai_legal_review_config` table | Present, 11 rows seeded, with `max_tokens`, `reasoning_effort`, `tier_complexity`, `section_instructions_by_tier` |
| New columns on `challenge_legal_docs` | All 7 BRD-required columns present (`ai_modified_content_html`, `ai_changes_summary`, `ai_review_status`, `ai_confidence`, `ai_regulatory_flags`, `version_history`, `creator_comments`) |
| Pass 3 re-run on Creator edits (Decision #5) | `notifyPass3Stale` wired in `useCreatorReview.submitEdits` |
| Creator approval (MP=mandatory, AGG=opt-in) | `CreatorApprovalCard` + `creator_approval_required` toggle in extended_brief |
| Creator comment-only on legal/escrow | `CreatorCommentSection` + `creator_comments` / `creator_escrow_comments` columns |
| LC review timeout 7d configurable | `lc_review_timeout_days` on `md_governance_mode_config` + `LcTimeoutConfigCard` admin UI |
| Override Creator timeout | `Pass3OverdueBanner` + `overrideCreatorApproval` mutation logging to `challenge_status_history` |
| FC escrow cross-validation | `Math.abs(deposit - reward_total) > 0.01` block in `EscrowManagementPage` |
| Audit trails | `challenge_status_history` + `challenge_edit_history` tables + `logStatusTransition` boundary |
| Hourly + daily cron enforcement | `enforce-lc-timeout-hourly`, `enforce-creator-approval-timeout-hourly` jobs ACTIVE |

---

### ⚠️ Identified GAPS (none blocking)

#### Gap A — Notification Matrix incomplete (Section 11)
BRD requires notifications for **6 events**; only **4 are wired**. Missing senders:

| BRD Event | Notification | Status |
|---|---|---|
| Curation + Pass 3 done → Creator | Email + In-app | ❌ Not wired in `useCuratorLegalReview.acceptPass3` |
| Creator approves → Curator (in-app) + LC (email if CTRL) | — | ❌ No `notifyCreatorApproved` helper exists |
| Creator requests changes → Curator | In-app | ❌ Not wired in `submitRequestRecuration` |
| LC approves (CTRL) → Curator + FC | In-app + Email | ❌ Not wired in `useLcPass3Review.acceptPass3` |
| FC confirms escrow → Curator | In-app | ✅ Wired (`notifyEscrowConfirmed`) |
| Pass 3 stale (Creator edits) | In-app | ✅ Wired (`notifyPass3Stale`) |

`workflowNotifications.ts` only exports 4 helpers. Missing: `notifyCurationComplete`, `notifyCreatorApproved`, `notifyCreatorChangesRequested`, `notifyLcApproved`.

#### Gap B — Two parallel cron paths (LC + Creator timeouts)
Both `enforce-lc-timeout-hourly` (Sprint 6) AND `check-review-timeouts` (Sprint 6B daily — **never scheduled**) handle the same job. The daily one was created but no cron entry exists. Either remove the unused `check-review-timeouts` function or schedule it. Currently no functional gap since hourly fns work, but **dead code creates confusion**.

#### Gap C — Email delivery missing
BRD Section 11 specifies "Email + In-app" for several events. All current notifications are **in-app only** (`cogni_notifications` table). No `send-email` integration in `workflowNotifications.ts`. Documented out-of-scope in Sprint 6B but still a BRD gap.

#### Gap D — Creator legal doc visibility (AGG opt-in path)
Per Decision #3, AGG Creator can opt in to see legal docs. The toggle exists (`CreatorApprovalCard`), but `CreatorChallengeReviewPage` always renders `CreatorCommentSection` regardless of the AGG opt-in flag. Should hide legal section entirely for AGG when `creator_approval_required=false`.

#### Gap E — `escrow_records` vs `escrow_transactions` naming
BRD references `escrow_transactions`; actual table is `escrow_records`. Functional alias only — **not a real gap**, but doc-vs-code drift to flag.

#### Gap F — STRUCTURED Phase 3 `required_role`
Sprint 0 spec only flipped `auto_complete=true`. Implementation also changed `required_role` from `LC` → `CU`. Consistent with Curator-absorbs-LC intent — **acceptable**, document it.

#### Gap G — UX navigation consistency
- After Curator accepts Pass 3 in STRUCTURED, no automatic navigation to Creator approval queue notification — Creator must manually find the challenge in `MyActionItemsSection`.
- `MyActionItemsSection` only shows `CR_APPROVAL_PENDING` items; no separate visual cue when Pass 3 has been re-run on Creator edits and is awaiting Curator/LC.
- No deep link from `cogni_notifications` rows into the relevant page (currently notifications are listed but don't carry actionable URLs).

#### Gap H — `LcLegalWorkspacePage.tsx` size
File is 1,358 lines (per BRD Section 12); component-policy cap is 250. Refactor was deferred per Sprint 4 plan but not executed. **Maintenance risk**, not a functional gap.

---

### 🧭 UX / Document Flow Verification

| Stage | Role transition | Status |
|---|---|---|
| Phase 2 → Phase 3 (CTRL) | CU → LC + FC auto-assigned via `complete_phase` | ✅ Working |
| Phase 3 LC complete → FC visible | `lc_compliance_complete=TRUE` gates `FcChallengeQueuePage` | ✅ Working |
| Phase 3 FC complete → Phase 4 | Both compliance flags → `complete_phase` advances | ✅ Working |
| Pass 3 acceptance → Creator review trigger | `creator_approval_requested_at` set in `useCurationActionData` | ✅ Working |
| Creator edit → Pass 3 stale → Curator/LC notified | `notifyPass3Stale` fires | ✅ Working |
| Creator timeout → override available | `Pass3OverdueBanner` + cron auto-flip | ✅ Working |
| Notification → action navigation | ❌ No clickable deep links | ❌ Gap G |

---

### 🎯 Recommended Fix Plan (Sprint 6C — small)

1. **Add missing notification helpers** (`notifyCurationComplete`, `notifyCreatorApproved`, `notifyCreatorChangesRequested`, `notifyLcApproved`) and wire into:
   - `useCuratorLegalReview.acceptPass3.onSuccess` → notify Creator
   - `useLcPass3Review.acceptPass3.onSuccess` → notify Curator + FC
   - `useCreatorReview.submitAcceptAll.onSuccess` → notify Curator (and LC if CTRL)
   - `useCreatorReview.requestRecuration.onSuccess` → notify Curator
2. **Decommission unused `check-review-timeouts`** edge function (or schedule it daily and remove the hourly duplicates).
3. **Hide `CreatorCommentSection` for AGG when `creator_approval_required=false`** in `CreatorChallengeReviewPage`.
4. **Add deep links to `cogni_notifications`** — extend the table with an `action_url` column and surface as clickable rows in `MyActionItemsSection`.
5. **Optional:** Refactor `LcLegalWorkspacePage` into `<LcLegalHeader>`, `<LcLegalDocsList>`, `<LcLegalActions>` to bring under 250 lines.
6. **Optional (P3):** Email delivery — wire `workflowNotifications` into a `send-workflow-email` edge function for the BRD-required Email events.

### Files (estimated)

| # | File | Type | Lines |
|---|---|---|---|
| 1 | `src/lib/cogniblend/workflowNotifications.ts` | MODIFY | +60 |
| 2 | `src/hooks/cogniblend/useCuratorLegalReview.ts` | MODIFY | +15 |
| 3 | `src/hooks/cogniblend/useLcPass3Review.ts` | MODIFY | +15 |
| 4 | `src/hooks/cogniblend/useCreatorReview.ts` | MODIFY | +20 |
| 5 | `src/pages/cogniblend/CreatorChallengeReviewPage.tsx` | MODIFY | +10 |
| 6 | `supabase/functions/check-review-timeouts/` | DELETE | — |
| 7 | Migration: `cogni_notifications.action_url` column | CREATE SQL | ~10 |
| 8 | `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | MODIFY | +15 |

### Out of Scope

- Email delivery integration (deferred per Sprint 6B).
- `LcLegalWorkspacePage` refactor (separate sprint — high risk of regression).
- Backfill of `creator_approval_requested_at` for already-pending challenges.

### Safety Guarantees

- All notification adds are fire-and-forget (existing `insertNotification` contract).
- QUICK mode untouched — every new helper gated on `governance_mode !== 'QUICK'` at call site.
- No changes to `complete_phase`, RLS, or any P0 plumbing.

