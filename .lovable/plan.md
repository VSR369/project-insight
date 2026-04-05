
# Implement Role Summary Document — All 4 Phases

## Context

The uploaded ROLE-SUMMARY-COMPLETE-2.md defines precise behavior per governance mode (STRUCTURED/CONTROLLED) × engagement model (MP/AGG) for Creator, Curator, LC, and FC roles. After auditing the codebase, several gaps exist between the document spec and current implementation.

## Current State vs Document Spec — Key Gaps

### DB Config Issues
1. **Role conflict matrix**: CONTROLLED mode has ER+LC as HARD_BLOCK, but doc says ER+LC is the ONLY allowed pair. Also CR+LC is not blocked but doc says it should be in CONTROLLED.
2. **STRUCTURED Phase 3 config**: `required_role = 'LC'` but doc says Phase 3 for STRUCTURED below-threshold should auto-complete (Curator already handled legal). The `complete_phase` logic handles this via threshold check, but the required_role blocks auto-advance for same-actor.

### Frontend Gaps
3. **Curator scope not governance-aware**: In CONTROLLED, Curator should do content ONLY (no legal, no escrow). In STRUCTURED, Curator handles legal+escrow below threshold. The `legalEscrowBlocked` logic in `useCurationPageOrchestrator.ts` currently blocks on legal for ALL modes including CONTROLLED where CU shouldn't touch legal at all.
4. **CurationActions totalCount hardcoded to 15**: Line 112 of `CurationRightRail.tsx` passes `totalCount={15}` but CHECKLIST_LABELS has 13 items.
5. **Checklist not governance-aware for CONTROLLED**: In CONTROLLED mode, the Curator checklist should NOT include legal/escrow items at all (CU doesn't touch those). Currently it shows "Escrow funding confirmed" for CONTROLLED.
6. **Creator detail view**: Missing governance-aware escrow status and LC status badges per the doc (lines 237-245).
7. **EscrowManagementPage**: FC doesn't set `fc_compliance_complete` flag after confirming escrow. It only writes to `escrow_records` but doesn't call `complete_financial_review` RPC.

---

## Changes

### 1. Fix Role Conflict Matrix (DB Migration)

Update `role_conflict_rules` to match the document:
- **CONTROLLED**: Remove ER+LC HARD_BLOCK (ER+LC is allowed). Add CR+LC HARD_BLOCK (doc says every pair except ER+LC is blocked).
- **STRUCTURED**: Current rules are correct (3 blocks: CR+CU, CR+ER, ER+FC). CR+LC is allowed (Curator can self-review legal below threshold).

### 2. Fix CurationRightRail totalCount (Frontend)

**File:** `src/components/cogniblend/curation/CurationRightRail.tsx` line 112

Change `totalCount={15}` to pass the actual count from the checklist summary length or remove the hardcoded value.

### 3. Make Curator Scope Governance-Aware (Frontend)

**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts` lines 168-178

Current logic:
```
needsLegalAcceptance = lc_review_required || legalDetails.length > 0
needsEscrowAcceptance = isControlledMode(governanceMode)
```

Per doc:
- **CONTROLLED**: Curator does NOT touch legal or escrow → `legalEscrowBlocked = false` always for CONTROLLED (LC and FC handle independently)
- **STRUCTURED**: Curator handles legal+escrow (below threshold auto-approved, above threshold LC takes over) → keep current logic

Fix: For CONTROLLED mode, set `legalEscrowBlocked = false` because CU has no legal/escrow responsibility.

### 4. Fix Curator Checklist for CONTROLLED (Frontend)

**File:** `src/pages/cogniblend/CurationChecklistPanel.tsx`

Current item 13: `isControlledMode ? "Escrow funding confirmed" : "Fee calculation verified"`

Per doc: In CONTROLLED, Curator does NO legal and NO escrow. The checklist should not have escrow/fee items for CONTROLLED. Replace with: In CONTROLLED, item 13 = "Creator approval requested" (since CONTROLLED requires creator sign-off). In STRUCTURED, item 13 = "Fee calculation verified" (Curator verifies fees and enters escrow).

### 5. FC Escrow → Compliance Flag Integration (Frontend)

**File:** `src/pages/cogniblend/EscrowManagementPage.tsx`

After successful escrow confirmation (line 118 onSuccess), call `complete_financial_review` RPC to set `fc_compliance_complete = TRUE` and potentially auto-advance the phase.

### 6. Creator Detail View — Escrow/Legal Status Badges (Frontend)

**File:** `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

Per doc lines 237-245:
- STRUCTURED: Show "Pending Review" or "Curator Reviewed" badges on legal docs card
- CONTROLLED: Show "Pending LC Review" badge on legal docs, "Pending FC Deposit" on escrow status
- Show Creator Approval section when Curator submits for sign-off (already done via `TieredApprovalView`)

Add an escrow status card below legal docs for CONTROLLED mode showing escrow deposit status.

### 7. Creator Detail Banner — Governance-Aware Pipeline Description (Frontend)

**File:** `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

Per doc:
- STRUCTURED: "Professional Review" pipeline banner
- CONTROLLED: "Enterprise Review Pipeline" banner

Currently shows generic status message. Add a governance-aware pipeline banner.

---

## File Summary

| Action | File | Change |
|--------|------|--------|
| Migration | SQL | Fix role_conflict_rules: swap ER+LC to ALLOWED, add CR+LC HARD_BLOCK for CONTROLLED |
| Edit | `src/components/cogniblend/curation/CurationRightRail.tsx` | Fix hardcoded `totalCount={15}` |
| Edit | `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | CONTROLLED: disable legal/escrow blocking for CU |
| Edit | `src/pages/cogniblend/CurationChecklistPanel.tsx` | CONTROLLED: remove escrow/fee item, add "Creator approval requested" |
| Edit | `src/pages/cogniblend/EscrowManagementPage.tsx` | Call `complete_financial_review` RPC after escrow funded |
| New | `src/components/cogniblend/challenges/ChallengeEscrowStatusCard.tsx` | Escrow status display for Creator detail view |
| Edit | `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Add pipeline banner + escrow status card |

All files stay under 200 lines.
