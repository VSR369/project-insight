
# Gap Analysis: CORRECTED-PIPELINE-FIX-PLAN-2.md vs Current Code

## All 5 Bugs: FIXED

| Bug | Status | Verification |
|-----|--------|-------------|
| B1: `lc_compliance_complete` never set | FIXED | `complete_legal_review` RPC exists in migration `20260403071548`, sets flag + role guard |
| B2: LcLegalWorkspacePage direct UPDATE bypass | FIXED | Line 560 now calls `supabase.rpc('complete_legal_review')` |
| B3: LegalDocumentAttachmentPage compliance crash | FIXED | Line 669 now calls `supabase.rpc('complete_legal_review')` |
| B4: CU auto-assign at wrong time | FIXED | `useSubmitSolutionRequest.ts` line 165: `if (currentPhase >= 3)` guard |
| B5: No CA gate on Creator submit | FIXED | `ChallengeCreatorForm.tsx` line 564 + `ChallengeWizardPage.tsx` line 819 both show `LegalGateModal` with `CHALLENGE_SUBMIT` |

## Root Cause Analysis: Silent Auto-Assign Failures — FIXED

| Root Cause | Status | Fix |
|------------|--------|-----|
| RC1: Pool seed uses displayName (fragile) | FIXED | `setup-test-scenario/index.ts` now matches by email + auth fallback |
| RC2: Silent catch blocks hide CU assign failures | FIXED | `LcLegalWorkspacePage.tsx` + `LegalDocumentAttachmentPage.tsx` now log + toast.warning |
| RC3: validateRoleAssignment defaults to STRUCTURED | FIXED | `useAutoAssignChallengeRoles.ts` resolves actual governance mode from DB |
| Pool-only assignment (no org fallback) | FIXED | `useAutoAssignChallengeRoles.ts` tries `org_users` when pool returns empty |
| `pool_member_id` NOT NULL blocks org assigns | FIXED | Migration makes column nullable + RPC guards workload increment |

## Additional Items from Doc

| Item | Status | Detail |
|------|--------|--------|
| D5: CHALLENGE_JOIN gate | FIXED | `SolverEnrollmentCTA.tsx` chains `SOLVER_ENROLLMENT` then `CHALLENGE_JOIN` gates |
| D6: WINNER_SELECTED gate | NOT WIRED | Trigger config seeded but no UI integration yet (future work) |
| D7: `as any` casts | OPEN | Requires Supabase type regeneration (out of scope) |
| D8: Client-side IP capture | OPEN | Low priority, fails gracefully |
| D9: PDF upload support | OPEN | Future enhancement |
| D10: Archive old templates | FIXED | Migration `20260403073113` archived 17 legacy templates |
