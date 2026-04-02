

# Assessment: Governance Mode Assignment & UX Adaptation

## Current State — What Works

### 1. Challenge Creation (FIXED)
`ChallengeCreatePage.tsx` now initializes governance as `'STRUCTURED'` (safe default), then resolves correctly from org profile once loaded. The `governance_mode_override` is saved to the DB via `initialize_challenge` RPC. **This is now correct.**

### 2. Per-Challenge Pages (CORRECT)
These pages resolve governance per-challenge using `resolveChallengeGovernance(override, orgProfile, tier)`:
- **ChallengeWizardPage** — adapts field visibility/requirements via `useGovernanceFieldRules`
- **AISpecReviewPage** — adapts review UX (1-click confirm vs section edit vs manual entry)
- **CurationChecklistPanel** — escrow required only for CONTROLLED
- **LegalDocumentAttachmentPage** — auto-attach in QUICK, manual in others
- **SolutionSubmitPage** — adapts submission flow
- **PublicationReadinessPage** — adjusts readiness checks

### 3. My Challenges List (FIXED)
`useMyChallenges` fetches `governance_profile` + `governance_mode_override` per challenge. Deduplication is working.

---

## What Does NOT Adapt by Governance Mode

### Sidebar Navigation — Role-Based, NOT Governance-Based
The sidebar (`CogniSidebarNav.tsx`) is driven entirely by **org-level roles** via `useCogniPermissions`. It shows/hides menu items based on whether the user holds CR, CU, ER, LC, FC roles — it does NOT change based on the governance mode of any challenge.

**This is architecturally correct** — the sidebar is an org-level shell. A user might have QUICK challenges AND CONTROLLED challenges simultaneously. The sidebar should show all sections the user's roles grant access to.

### Dashboard — No Governance Filtering
The dashboard shows all challenges regardless of governance mode. Each challenge card could show its governance badge, but doesn't currently filter or group by mode.

### Governance Badge in Sidebar
The `GovernanceProfileBadge` in `CogniSidebar.tsx` shows the **org-level** governance profile (from `currentOrg.governanceProfile`), not per-challenge. This is correct for the shell — it reflects the org default.

---

## Real Remaining Issue: Role Separation Enforcement

The governance mode IS correctly stored per challenge now. But the **critical gap** is:

**For CONTROLLED challenges, the system should prevent the Creator from also being assigned CU/ER/LC/FC.** The DB has a `validate_role_separation` function, but it's only checked during phase transitions — not during initial role assignment in `auto_assign_challenge_role`.

Currently, when a QUICK challenge is created, all 5 roles are correctly merged to the Creator. When a CONTROLLED challenge is created, only CR should be assigned to the Creator — the other roles must go to separate pool users. This logic lives in the `auto_assign_challenge_role` RPC, which we should verify is governance-aware.

---

## Verdict

| Area | Status | Notes |
|------|--------|-------|
| Governance mode saved to DB | Working | `governance_mode_override` set correctly |
| Per-challenge UX adaptation | Working | Field rules, checklists, legal, escrow all adapt |
| Sidebar navigation | Correct (role-based) | Should NOT change per governance mode |
| Dashboard governance badges | Missing | Could show per-challenge governance badge on cards |
| Role assignment by governance | Needs verification | `auto_assign_challenge_role` RPC must be governance-aware |
| Role separation enforcement | Partially implemented | `validate_role_separation` exists but may not block assignment |

## Recommended Next Steps

### Step 1: Verify `auto_assign_challenge_role` RPC is governance-aware
Check if the RPC reads `governance_mode_override` to decide whether to merge roles (QUICK) or separate them (CONTROLLED). If not, this is the root bug.

### Step 2: Add governance badge to challenge cards
In `MyChallengesPage` and dashboard challenge cards, show the resolved governance mode badge (QUICK/STRUCTURED/CONTROLLED) so users can see which mode each challenge uses.

### Step 3: No sidebar changes needed
The sidebar correctly operates at the org/role level. Per-challenge governance adaptation happens inside challenge-specific pages, which is the correct architecture.

