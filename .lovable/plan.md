

# Final Comprehensive Plan: Streamlined Challenge Creation Flow + Curation/Approval Pipeline

## What Already Exists (No Changes Needed)

| Component | Status |
|-----------|--------|
| ConversationalIntakePage (6-field AI intake for CR/CA) | Implemented |
| CogniSubmitRequestPage (12-field Solution Request for AM/RQ) | Implemented (will be simplified) |
| CurationChecklistPanel (15-item checklist + Submit to ID button) | Implemented |
| ApprovalReviewPage (ID reviews challenge, 4 tabs, ApprovalActionBar) | Implemented |
| ApprovalQueuePage (ID queue listing) | Implemented |
| RoleSwitcher in CogniTopBar | Implemented (hidden on mobile) |
| CogniRoleContext (role switching, localStorage sync) | Implemented |
| Governance mode per-challenge, tier-gated | Implemented correctly |
| Engagement model per-challenge | Implemented correctly |

---

## 6 Implementation Steps

### Step 1: Role-Based Auto-Routing on ChallengeCreatePage

**File: `src/pages/cogniblend/ChallengeCreatePage.tsx`**

- When `activeRole` is `AM` or `RQ`: skip card layout, render `SimpleIntakeForm` inline
- When `activeRole` is `CR` or `CA`: show 2 cards with renamed labels:
  - "Describe Your Problem" (was "AI-Assisted") — badge: Recommended
  - "Build Spec Manually" (was "Manual Editor") — no badge change
- Remove the Solution Request card (AM/RQ no longer navigate to `/cogni/submit-request`)
- Keep `CreationContextBar` and `GovernanceFooter`

### Step 2: Create SimpleIntakeForm (5-field AM/RQ Intake)

**New file: `src/components/cogniblend/SimpleIntakeForm.tsx`**

| Field | Type | Required |
|-------|------|----------|
| Title | Text (max 100 chars) | Yes |
| Problem Summary | Textarea (max 500 chars) | Yes |
| Sector/Domain | Dropdown (`md_industry_segments`) | Yes |
| Budget Range | Min/Max + Currency | Yes |
| Timeline | Dropdown (1-3/3-6/6-12/12+ months) | Yes |

Writing prompt below Problem Summary textarea: *"Describe what is broken, who is affected, and what a good solution would achieve."*

On submit: creates challenge at Phase 1, assigns Challenge Architect (MP: manual picker, AGG: auto), navigates to confirmation. Reuses `useSubmitSolutionRequest` mutation.

**Retire `/cogni/submit-request`**: Add redirect in `CogniSubmitRequestPage.tsx` to `/cogni/challenges/create`.

### Step 3: Add Guided Prompts to ConversationalIntakePage

**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`**

Add 3 guiding prompts as helper text (not new fields) below the Problem Statement and Expected Outcomes textareas for CA/CR:

- Below Problem Statement: *"What approaches have already been tried?"* and *"What constraints must the solution work within?"*
- Below Expected Outcomes: *"What does a successful solution look like?"*

These appear as styled hint text (italic, muted color) to guide thinking without adding form fields.

### Step 4: Hide Curator-Only Fields in ChallengeWizardPage

**File: `src/pages/cogniblend/ChallengeWizardPage.tsx`**

When `activeRole` is `CR` or `CA`, hide/disable the following wizard steps or fields:
- StepRewards: reward tiers, escrow, payment milestones, rejection fee percentage
- These fields remain visible and editable when `activeRole` is `CU` (Curator)

Implementation: read `activeRole` from `useCogniRoleContext()`, pass `isCuratorView` prop to `StepRewards` and `StepTimeline` to conditionally render financial fields.

### Step 5: Enhance Curation Checklist with Compliance Items

**File: `src/pages/cogniblend/CurationChecklistPanel.tsx`**

The existing 15-item checklist already covers most items. Verify and ensure these specific compliance checks from Claude's feedback are explicitly present:

| Check | Current Status |
|-------|---------------|
| Legal docs attached | Items 10, 11 — already implemented (locked) |
| IP model confirmed | Not explicit — add as item or verify via `challenge.ip_model` |
| Reward structure validated | Item 5 — already implemented |
| Payment milestones sum to 100% | Item 4 (eval weights) exists; add milestone weight check |
| NDA/CSA in place | Covered by Tier 1 legal (item 10) |
| Eligibility criteria set | Item 8 — already implemented |

Changes:
- Replace item 9 ("Taxonomy tags applied" — currently a placeholder `false`) with "IP model confirmed" (auto-check: `!!challenge.ip_model`)
- Add validation that payment milestone weights sum to 100% within the reward structure check (item 5)
- "Submit to Innovation Director" button already exists and is gated by `allComplete` — no change needed

### Step 6: All Roles Summary Widget + Mobile RoleSwitcher

**New file: `src/components/cogniblend/dashboard/AllRolesSummaryWidget.tsx`**

For users with 2+ roles, shows compact role cards above other dashboard widgets. Each card: role badge color, role name, pending action count from `roleChallengeCount`. Clicking a card calls `setActiveRole()`.

**File: `src/components/cogniblend/shell/CogniTopBar.tsx`**
- Remove `hidden md:block` wrapper around `RoleSwitcher` — make visible on all breakpoints
- Compact pill design on mobile (show role code only)

**File: `src/pages/cogniblend/CogniDashboardPage.tsx`**
- Add `AllRolesSummaryWidget` above `WhatsNextCard` when `availableRoles.length >= 2`

---

## What is NOT Changed

- Innovation Director role (ID) — already fully implemented with ApprovalQueuePage + ApprovalReviewPage + ApprovalActionBar
- Governance mode — stays per-challenge, tier-gated (Basic=QUICK only, Standard=QUICK+STRUCTURED, Premium=all three)
- Engagement model — stays per-challenge
- ConversationalIntakePage field count (6 fields) — unchanged, only adding helper text
- CurationReviewPage — unchanged (Submit to ID button + 15-item checklist already work)
- Extended brief + Challenge Settings panels — unchanged
- All phase gates (GATE-02, GATE-04, GATE-11) — unchanged

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Modify | `ChallengeCreatePage.tsx` | Role-based auto-routing, rename 2 cards, remove Solution Request card |
| Create | `SimpleIntakeForm.tsx` | 5-field lightweight form with writing prompt for AM/RQ |
| Modify | `CogniSubmitRequestPage.tsx` | Redirect to `/cogni/challenges/create` |
| Modify | `ConversationalIntakePage.tsx` | Add 3 guiding prompts as helper text |
| Modify | `ChallengeWizardPage.tsx` | Hide reward/escrow/milestone fields for CR/CA |
| Modify | `CurationChecklistPanel.tsx` | Replace placeholder item 9, strengthen item 5 |
| Create | `AllRolesSummaryWidget.tsx` | Multi-role dashboard summary |
| Modify | `CogniDashboardPage.tsx` | Add AllRolesSummaryWidget |
| Modify | `CogniTopBar.tsx` | RoleSwitcher visible on all breakpoints |

## Implementation Order

| Step | Effort | Dependencies |
|------|--------|-------------|
| Step 1: Role-based auto-routing | Medium | Step 2 (needs SimpleIntakeForm) |
| Step 2: SimpleIntakeForm + retire Solution Request | Medium | None |
| Step 3: Guided prompts on ConversationalIntakePage | Small | None |
| Step 4: Hide Curator-only fields in wizard | Small | None |
| Step 5: Strengthen curation checklist | Small | None |
| Step 6: AllRolesSummaryWidget + mobile RoleSwitcher | Medium | None |

Steps 2-5 can be parallelized. Step 1 depends on Step 2. Step 6 is independent.

