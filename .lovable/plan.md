

# Confirmation Report — S9R Workflow Realignment

## ✅ All 4 Governance Paths — Backend FULLY IMPLEMENTED

The database is the single source of truth and **all four paths work exactly as you specified**. Verified directly in the live DB:

### Path 1 — MP × STRUCTURED ✅
- `send_to_legal_review` detects STRUCTURED → sets `cu_compliance_mode=true`, **does NOT assign LC/FC**
- `complete_curator_compliance` (Curator) → `request_creator_approval` (always required for MP via trigger)
- Creator approves → Phase 4

### Path 2 — MP × CONTROLLED ✅
- `send_to_legal_review` detects CONTROLLED → assigns **LC + FC** from pool
- `complete_legal_review` + `complete_financial_review` both gated `RAISE EXCEPTION IF governance <> CONTROLLED`
- When both done → status flips to `pending_curator_review`, **Curator notified (NOT Creator)**
- `curator_forward_pack_to_creator` → `request_creator_approval` → Creator → Phase 4

### Path 3 — AGG × STRUCTURED ✅
- Same as Path 1 but `creator_approval_required` is **opt-in** (Creator toggle)
- If `true` → routes to Creator
- If `false` → `complete_curator_compliance` calls `complete_phase` directly → Phase 4 (no Creator pause)

### Path 4 — AGG × CONTROLLED ✅
- Same as Path 2 but `curator_forward_pack_to_creator` branches:
  - `creator_approval_required=true` → Creator approval flow
  - `creator_approval_required=false` → `complete_phase` → Phase 4 directly

### Enforcement guarantees ✅
- **Trigger `trg_challenges_force_mp_creator_approval`** forces `creator_approval_required=true` for any MP+STRUCTURED/CONTROLLED row, even on direct UPDATE — Creator cannot opt out for MP.
- **CHECK constraint** includes `pending_curator_review` sub-state.
- **Pack always returns to Curator first** — guaranteed by `pending_curator_review` gate in both `complete_legal_review` and `complete_financial_review`.

---

## ⚠️ Two Non-Blocking UI Gaps Remaining

The workflow **functions correctly end-to-end via RPC**, but two UI guards from the original plan were not wired. They do not break the workflow (DB enforces everything) but should be added for clean UX:

### Gap U1 — `CreatorApprovalCard` toggle still enabled for MP
- File: `src/components/cogniblend/manage/CreatorApprovalCard.tsx`
- Current: Switch is enabled for both MP and AGG.
- Impact: Creator can *try* to toggle off for MP, but the DB trigger silently re-forces it back to `true` on save. Toast says "disabled" but the value is actually `true`.
- Fix: Disable switch when `operating_model='MP'` with helper text "Always required for Marketplace challenges".

### Gap U2 — LC/FC queue/workspace pages don't filter STRUCTURED out
- Files: `LcLegalWorkspacePage.tsx`, `EscrowManagementPage.tsx`, `LcChallengeQueuePage.tsx`, `FcChallengeQueuePage.tsx`
- Current: Pages fetch all challenges regardless of governance mode.
- Impact: Backfill already deactivated existing STRUCTURED LC/FC role rows (so queues are empty in practice), and STRUCTURED never assigns NEW LC/FC rows — so queues *will* stay empty. But there's no defensive guard if a stale row appears.
- Fix: Add `governance_profile IN ('CONTROLLED','ENTERPRISE')` filter at query level + top-of-page empty-state guard.

---

## 🔧 Plan to Close the Two UI Gaps

### Step 1 — Disable MP creator-approval toggle
Edit `src/components/cogniblend/manage/CreatorApprovalCard.tsx`:
- Disable `<Switch>` when `operating_model === 'MP'`.
- Show inline helper text: "Always required for Marketplace challenges."
- Add confirmation dialog when AGG creator toggles OFF: "Curator will publish immediately after compliance — you will not see the final pack."

### Step 2 — Add STRUCTURED guard to LC/FC pages
- `src/hooks/cogniblend/useLcLegalData.ts` (queue list query): add `.in('governance_profile', ['CONTROLLED','ENTERPRISE'])`.
- `src/pages/cogniblend/EscrowManagementPage.tsx`: filter the challenge fetch loop to skip STRUCTURED rows.
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`: top-of-page guard — if loaded challenge is STRUCTURED, render empty-state "Not applicable for Structured governance — Curator handles compliance" with back link.
- Same guard for `EscrowManagementPage.tsx` per-challenge cards (don't render escrow form when STRUCTURED).

### Step 3 — Smoke test
Manually verify each of the 4 paths once after the UI fixes:
1. Create MP+STRUCTURED challenge → confirm Creator-approval toggle disabled.
2. Create MP+CONTROLLED challenge → Curator sends to LC/FC → both submit → Curator sees pack panel → forwards → Creator sees approval card.
3. Create AGG+STRUCTURED with opt-out OFF → Curator submits compliance → challenge auto-publishes (no Creator card).
4. Create AGG+CONTROLLED with opt-in ON → full LC/FC/Curator/Creator chain.

---

## Summary

| Layer | Status |
|---|---|
| DB schema (`cu_compliance_mode`, `pending_curator_review`) | ✅ Done |
| RPC routing (all 6 functions) | ✅ Done |
| MP-always-approval trigger | ✅ Done |
| Curator Compliance Tab (STRUCTURED) | ✅ Done |
| Curator Pack Review Panel (CONTROLLED) | ✅ Done |
| Creator pending banner | ✅ Done |
| Backfill (revoke stale STRUCTURED LC/FC roles) | ✅ Done |
| **MP toggle disabled in UI** | ⚠️ Pending |
| **LC/FC pages STRUCTURED guard** | ⚠️ Pending |

**Workflow configuration ↔ implementation alignment: confirmed.** The 4 paths you described match `md_lifecycle_phase_config` + `md_engagement_models` + the `extended_brief.creator_approval_required` gate. The two remaining items are defensive UI polish — DB enforces everything regardless.

Approve and I'll close gaps U1 and U2 in one pass.

