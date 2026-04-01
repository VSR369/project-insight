

# Implementation Plan: FINAL EXECUTION PLAN Alignment

## Assessment: What's Already Done vs. What Remains

After auditing every line of the uploaded document against the current codebase, here is the status:

```text
PHASE 1: BUG FIXES + FOUNDATION
  1.1 isFieldVisible for 'auto'          ✅ DONE (already handles 'auto')
  1.2 MyChallengesPage operator fix       ✅ DONE (parentheses present on line 87)
  1.3 Form key prop on mode change        ✅ DONE (key={governanceMode-engagementModel} on line 318)
  1.4 Snapshot format (serializeLineItems) ⚠️  NEEDS VERIFICATION
  1.5 useEffect dependency fix            ⚠️  NEEDS VERIFICATION
  1.6 Solo mode threshold (>=6 → >=4)     ❌ NOT DONE (still >=6 on line 44)
  
PHASE 2: LEGACY ROLE CLEANUP
  2.1 Remove CA from permissions          ❌ NOT DONE (CA still in useCogniPermissions)
  2.2 Remove CA from CurationActions      ⚠️  NEEDS VERIFICATION
  2.3 Replace ID with CU/CR in hooks      ❌ NOT DONE (ID still in 4 hooks)
  2.4 DB: role_authority_matrix cleanup    ❌ NOT DONE
  2.5 DB: notification_routing cleanup     ❌ NOT DONE
  2.6 Delete dead code files              ✅ DONE (files don't exist)
  2.7 Clean up legacy role text refs       ❌ NOT DONE

PHASE 3: CREATOR FORM ALIGNMENT
  3.1 DB: Fix governance field rules       ✅ DONE
  3.2 Align Creator form schema with DB    ✅ DONE (industry required for STRUCTURED/CONTROLLED,
      CONTROLLED context fields required, correct min/max)
  3.3 Hide QUICK fields in AdditionalCtx   ✅ DONE (isQuick guards on 6 context fields)
  3.4 Strip auto/hidden from snapshot      ✅ DONE (stripHiddenFields exists)
  3.5 Extract displayHelpers              ✅ DONE (file exists, imports in place)
  3.6 Extract shared draft payload builder ⚠️  NEEDS VERIFICATION

PHASE 4: CREATOR APPROVAL FLOW
  4.1 Add Creator Approval toggle to form  ✅ DONE (creator_approval_required in schema + StepModeSelection Switch)
  4.2 DB: Create section_approvals table   ✅ DONE (challenge_section_approvals with RLS)
  4.3 Update CurationActions for approval  ✅ DONE (Phase B rewired to CR_APPROVAL_PENDING)
  4.4 Update MyChallengesPage for approval ✅ DONE (CR_APPROVAL_PENDING status + Review & Approve button)
  4.5 Add approval banner to DetailView    ✅ DONE (violet banner with Approve/Request Changes + curator tab auto-select)

PHASE 5: CONTROLLED MODE — ROLE SEPARATION
  5.1 DB: validate_role_separation fn      ✅ DONE (validate_role_assignment RPC with HARD_BLOCK/SOFT_WARN/ALLOWED)

PHASE 6: GOVERNANCE-AWARE PHASE GATING
  6.1 DB: validate_gate_03 function        ❌ NOT DONE
  6.2 Wire gate into complete_phase        ❌ NOT DONE
```

---

## Phased Implementation Plan

### EXECUTION PHASE A — Remaining Bug Fixes (Low Risk)

**Prompt A1: Fix solo mode threshold + verify snapshot/useEffect**
- `CogniRoleContext.tsx` line 44: Change `>= 6` to `>= 4`
- Verify `useSubmitSolutionRequest.ts` snapshot uses `serializeLineItems` for expected_outcomes
- Verify `ChallengeCreatePage.tsx` useEffect dependency

---

### EXECUTION PHASE B — Legacy Role Cleanup (Medium Risk)

**Prompt B1: Remove CA from useCogniPermissions**
- Remove `'CA'` from `SEEKING_ORG_ROLES` set
- Remove `'CA'` from all `sees()` and `can()` calls (6 locations)

**Prompt B2: Replace ID with CU/CR in 4 hooks**
- `useApprovalActions.ts`: `initiated_by: 'ID'` → `'CU'`
- `useEscrowDeposit.ts`: `.eq('role_code', 'ID')` → `'CU'`
- `useManageChallenge.ts`: `p_required_role: 'ID'` → `'CU'`
- `useWithdrawSolution.ts`: `.in('role_code', ['ID', 'ER'])` → `['CU', 'ER']`

**Prompt B3: Remove CA from CurationActions + Clean legacy text**
- `CurationActions.tsx`: `.in("role_code", ["CR", "CA"])` → `.eq("role_code", "CR")`
- `StepModeSelection.tsx`, `TestSetupPage.tsx`, `AIReviewInline.tsx`, `useCancelChallenge.ts`: Update text/comments

**Prompt B4: DB migrations for role_authority_matrix + notification_routing**
- Update `role_authority_matrix`: AM→CR, ID→CU/CR per phase
- Update `notification_routing`: AM→CR, ID→CU in primary/escalation/cc arrays
- Recreate `get_phase_required_role` function with modern role mapping

---

### EXECUTION PHASE C — Creator Form Alignment (Medium Risk)

**Prompt C1: Align buildCreatorSchema with FINAL-EXECUTION-PLAN field matrix**
- Title max: 100 → 200
- Problem min: `isQuick ? 200 : isControlled ? 500 : 300`
- Scope min: `isControlled ? 200 : 150` (QUICK already handled)
- `industry_segment_id`: optional for QUICK, required for STRUCTURED/CONTROLLED
- `preferred_approach` / `approaches_not_of_interest`: always optional (remove CONTROLLED enforcement)
- `context_background` / `root_causes` / `current_deficiencies` / `affected_stakeholders`: keep CONTROLLED required

**Prompt C2: Hide QUICK context fields in AdditionalContextTab**
- Add `isQuick` guard to hide context_background, root_causes, affected_stakeholders, current_deficiencies, preferred_approach, approaches_not_of_interest
- Keep Timeline, Reference Files, Reference URLs visible for ALL modes
- Update info banner text for QUICK mode

---

### EXECUTION PHASE D — Creator Approval Flow (High Impact, New Feature)

**Prompt D1: Add creator_approval_required toggle + schema**
- Add `creator_approval_required: z.boolean()` to form schema
- Add Switch to EssentialDetailsTab with governance-aware defaults
- QUICK: default No; STRUCTURED: default Yes; CONTROLLED: forced Yes + disabled

**Prompt D2: DB migration — challenge_section_approvals table**
- Create table with challenge_id, section_key, status, reviewer_id, comment
- RLS policies for authenticated read + challenge role holders manage

**Prompt D3: Rewire CurationActions for creator approval**
- Replace `am_approval_required` with `creator_approval_required` from extended_brief
- Rename variables/audit actions: AM → CR
- Update submit button label

**Prompt D4: MyChallengesPage approval state + DetailView banner**
- Add `CR_APPROVAL_PENDING` status config + action button in MyChallengesPage
- Add approval banner to CreatorChallengeDetailView with Approve/Request Changes
- Auto-select Curator Version tab; remove blocking placeholder when pending

---

### EXECUTION PHASE E — CONTROLLED Mode Enforcement (High Compliance)

**Prompt E1: DB migration — validate_role_separation function**
- CR+CU and CU+LC blocked for same user in CONTROLLED mode
- LC and FC exempt from restrictions

---

### EXECUTION PHASE F — Governance-Aware Phase Gating (Final)

**Prompt F1: DB migration — validate_gate_03 + wire into complete_phase**
- Gate A: Creator approval check (STRUCTURED with toggle / CONTROLLED always)
- Gate B: LC approval (CONTROLLED only)
- Gate C: Escrow funded (CONTROLLED only)
- Wire into `complete_phase` function before existing Phase 4 gate

---

## Summary

| Phase | Prompts | Risk | Description |
|-------|---------|------|-------------|
| **A** | 1 | Low | Remaining bug fixes (solo threshold) |
| **B** | 4 | Medium | Legacy role elimination (CA, AM, ID, RQ) |
| **C** | 2 | Medium | Creator form schema + QUICK field hiding |
| **D** | 4 | High | Creator Approval flow (new feature) |
| **E** | 1 | Medium | CONTROLLED role separation enforcement |
| **F** | 1 | Low | Phase gating DB functions |

**Total: 13 prompts across 6 phases. ~15 files modified. 4 DB migrations. Zero breaking changes.**

Each phase is self-contained — run one phase, verify, then proceed to the next. Approve this plan and I will start with Phase A.

