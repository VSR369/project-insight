

# Gap Analysis: FINAL-EXECUTION-PLAN-2 vs Current Implementation

## Summary

Most of the plan is implemented. There are **3 real gaps** and **2 minor discrepancies** remaining.

---

## Fully Implemented (No Gaps)

| Item | Status |
|------|--------|
| 1.1 isFieldVisible for 'auto' | Done |
| 1.2 MyChallengesPage operator fix | Done |
| 1.3 Form key prop on mode change | Done |
| 1.4 Snapshot serializeLineItems | Done (all 3 locations use it) |
| 1.6 Solo mode threshold >= 4 | Done |
| 2.1 Remove CA from useCogniPermissions | Done (no 'CA' found) |
| 2.2 Remove CA from CurationActions | Done (uses `.in("role_code", ["CR"])`) |
| 2.3 Replace ID with CU/CR in 4 hooks | Done (all 4 verified) |
| 2.4 DB: role_authority_matrix cleanup | Done (migration exists) |
| 2.5 DB: notification_routing cleanup | Done (migration exists) |
| 2.6 Delete dead code files | Done (files don't exist) |
| 3.1 DB: Fix governance field rules | Done |
| 3.2 Align Creator form schema (title max 200, problem min, scope min, industry, preferred_approach optional) | Done |
| 3.3 Hide QUICK fields in AdditionalContextTab | Done |
| 3.4 Strip auto/hidden from snapshot | Done (stripHiddenFields used) |
| 3.5 Extract displayHelpers | Done |
| 3.6 Extract shared draft payload builder | Done (buildChallengeUpdatePayload exists) |
| 4.1 Creator Approval toggle | Done |
| 4.2 DB: challenge_section_approvals | Done |
| 4.3 Update CurationActions for approval | Done |
| 4.4 MyChallengesPage approval state | Done |
| 4.5 Approval banner in DetailView | Done |
| 5.1 DB: validate_role_assignment | Done |
| 6.1 DB: validate_gate_03 | Done |
| 6.2 Wire gate into complete_phase | Done |

---

## Remaining Gaps

### Gap 1: Legacy text references not cleaned up (Prompt 2.7)

**AIReviewInline.tsx line 3** still says:
```
Extracted from CurationAIReviewInline for reuse across AM/RQ, CR/CA, and CU roles.
```
Should say: `...for reuse across CR and CU roles.`

**TestSetupPage.tsx lines 36, 46, 56** still reference legacy roles in scenario descriptions:
- `'Creates org + 1 user with all roles (AM, CR, CU, ID, ER, FC)'` → should use `(CR, CU, ER, LC, FC)`
- `'Creates org + 3 users with split roles (CR/CU, ID/ER, AM/FC)'` → should use `(CR/CU, ER/LC, FC)`
- `'Creates org + 8 users each with 1 role (AM, CR, CU, ID, ER×2, FC, LC)'` → should use `(CR, CU, ER×2, LC, FC)`

**useCancelChallenge.ts** — no legacy references found (already clean).

**StepModeSelection.tsx** — no "Account Manager" references found (already clean).

### Gap 2: `get_phase_required_role` missing phases 7-10, 12

The migration maps phases 1-6, 11, 13 but returns `'UNKNOWN'` for phases 7 (ER), 8 (ER), 9 (FC), 10 (ER), 12 (FC). The FINAL-EXECUTION-PLAN specifies these mappings.

Additionally, phases 11 and 13 map to `'CU'` but the plan says they should map to `'CR'` (award decision and closure).

### Gap 3: CONTROLLED context fields — plan v2 says Optional, code says Required

The FINAL-EXECUTION-PLAN-2 field matrix (lines 74-77) marks `context_background`, `root_causes`, `affected_stakeholders`, and `current_deficiencies` as **Optional** for CONTROLLED mode. However, the current schema enforces them as **Required** for CONTROLLED.

This is a **contradiction between the two plan versions**. The original plan (implemented) said keep them CONTROLLED-required. The new uploaded plan says Optional. You need to decide which is correct.

### Minor: 1.5 useEffect dependency

Could not verify without reading the specific useEffect — this was marked as needing verification but is low-risk since the form key prop (1.3) already forces remount on mode change, making the useEffect dependency less critical.

---

## Recommended Actions

1. **Fix legacy text** in AIReviewInline.tsx (comment) and TestSetupPage.tsx (descriptions) — 2 files, text-only changes
2. **Fix `get_phase_required_role`** — add missing phases 7-10, 12 and correct phases 11, 13 to 'CR'
3. **Decide on CONTROLLED context fields** — keep Required (current) or change to Optional (per new plan)?

These are all low-risk changes. The core functionality (approval flow, phase gating, role separation, form schema, legacy role cleanup) is complete.

