

# Fix 12 Gaps — Role Summary Alignment

## Current State (from DB + code audit)

- **STRUCTURED Phase 3**: `required_role = 'LC'` — but doc says Curator handles legal+escrow, so should be `'CU'`
- **complete_phase**: Has threshold routing for STRUCTURED that conditionally sets `lc_compliance_complete`. Per doc, STRUCTURED should ALWAYS auto-approve lc+fc (Curator handled everything in Phase 2)
- **CONTROLLED Phase 3**: Correct — `required_role = 'LC'`, `gate_flags = [lc_compliance_complete, fc_compliance_complete]`
- **Escrow modes**: QUICK=not_applicable, STRUCTURED=optional, CONTROLLED=mandatory — correct
- **Legal modes**: QUICK=auto_apply, STRUCTURED=manual_review, CONTROLLED=ai_review — correct

## Changes (4 prompts)

### Prompt 1: SQL Migration (Fixes #3, #4)

**Update `md_lifecycle_phase_config`:**
- STRUCTURED Phase 3: `required_role = 'CU'`, `secondary_role = NULL`

**Rewrite `complete_phase` Step 7 for STRUCTURED:**
- Remove threshold routing entirely. STRUCTURED always sets `lc_compliance_complete = TRUE` and `fc_compliance_complete = TRUE` (Curator self-reviewed legal, escrow is optional)
- Legal docs inserted as `'curator_reviewed'` / `'approved'` for STRUCTURED
- CONTROLLED: `lc_compliance_complete` and `fc_compliance_complete` stay FALSE (LC and FC must independently complete)
- Keep AGG/MP template routing (already correct)

### Prompt 2: TypeScript Fixes — 6 Files (Fixes #1, #2, #5, #7, #8, #11)

| # | File | Line | Current | Fix |
|---|------|------|---------|-----|
| 1 | `ChallengeConfigurationPanel.tsx` | 29 | `$10K–$150K` | `$25K–$100K` |
| 2 | `ChallengeCreatorForm.tsx` | 194 | `disabled={isBusy \|\| (isControlled && !aiReviewCompleted)}` | `disabled={isBusy}` |
| 5 | `CurationChecklistPanel.tsx` | 157 | CONTROLLED: `"Escrow funding confirmed"` | `"Creator approval requested"` |
| 7 | `CurationRightRail.tsx` | 112 | `totalCount={15}` | `totalCount={checklistSummary.length}` |
| 8 | `useCurationPageOrchestrator.ts` | 173-174 | Blocks CU on legal+escrow for CONTROLLED | CONTROLLED: `legalEscrowBlocked = false` |
| 11 | `ChallengeConfigSummary.tsx` | 104 | Implies mandatory AI review pipeline | Add "advisory AI review" for CONTROLLED description |

### Prompt 3: FC Integration (Fixes #6, #9)

**EscrowManagementPage.tsx** (line 118 onSuccess):
- After escrow save, call `supabase.rpc('complete_financial_review', { p_challenge_id, p_user_id })` 
- Toast success with phase advancement info

**New file: `FcChallengeQueuePage.tsx`** (~120 lines):
- Query: challenges where user has FC role, `fc_compliance_complete = FALSE`, `current_phase = 3`
- Each row shows challenge title, reward total, escrow status, link to escrow management
- Route: `/cogni/fc-queue` added to App.tsx + sidebar nav

### Prompt 4: Seed + Cleanup (Fixes #10, #12)

**creatorSeedContent.ts:**
- MP_SEED: `platinum_award: 45000000` (INR) — fine as-is (INR equivalent ~$55K)
- AGG_SEED: `platinum_award: 0` — no change needed
- If a USD STRUCTURED seed exists with $120K, change to $75K

**useAutoAssignChallengeRoles.ts** (Fix #10):
- `validateRoleAssignment` calls `role_conflict_rules` — this is correct behavior. The role conflict matrix IS the governance enforcement mechanism. No change needed here — the admin RoleConvergencePage manages the matrix, and the auto-assign correctly checks it. Gap #10 is a non-issue.

## File Summary

| Action | File | Gaps |
|--------|------|------|
| Migration | SQL | #3, #4 |
| Edit | `ChallengeConfigurationPanel.tsx` | #1 |
| Edit | `ChallengeCreatorForm.tsx` | #2 |
| Edit | `CurationChecklistPanel.tsx` | #5 |
| Edit | `CurationRightRail.tsx` | #7 |
| Edit | `useCurationPageOrchestrator.ts` | #8 |
| Edit | `ChallengeConfigSummary.tsx` | #11 |
| Edit | `EscrowManagementPage.tsx` | #6 |
| New | `FcChallengeQueuePage.tsx` | #9 |
| Edit | `App.tsx` + sidebar | #9 |
| Edit | `creatorSeedContent.ts` | #12 (if needed) |

All components stay under 200 lines.

