

# Gap Analysis: CORRECTED-PIPELINE-FIX-PLAN-2.md vs Current Code

## All 5 Bugs: FIXED

| Bug | Status | Verification |
|-----|--------|-------------|
| B1: `lc_compliance_complete` never set | FIXED | `complete_legal_review` RPC exists in migration `20260403071548`, sets flag + role guard |
| B2: LcLegalWorkspacePage direct UPDATE bypass | FIXED | Line 560 now calls `supabase.rpc('complete_legal_review')` |
| B3: LegalDocumentAttachmentPage compliance crash | FIXED | Line 669 now calls `supabase.rpc('complete_legal_review')` |
| B4: CU auto-assign at wrong time | FIXED | `useSubmitSolutionRequest.ts` line 165: `if (currentPhase >= 3)` guard |
| B5: No CA gate on Creator submit | FIXED | `ChallengeCreatorForm.tsx` line 564 + `ChallengeWizardPage.tsx` line 819 both show `LegalGateModal` with `CHALLENGE_SUBMIT` |

## Additional Items from Doc

| Item | Status | Detail |
|------|--------|--------|
| D5: CHALLENGE_JOIN gate | FIXED | `SolverEnrollmentCTA.tsx` chains `SOLVER_ENROLLMENT` then `CHALLENGE_JOIN` gates |
| D6: WINNER_SELECTED gate | NOT WIRED | Trigger config seeded but no UI integration yet (future work) |
| D7: `as any` casts | OPEN | Requires Supabase type regeneration (out of scope) |
| D8: Client-side IP capture | OPEN | Low priority, fails gracefully |
| D9: PDF upload support | OPEN | Future enhancement |
| D10: Archive old templates | **GAP — 17 templates still active** | `document_code IS NULL AND is_active = true` returns 17 rows |

## RPC Return Shape: Minor Deviation (Not a Bug)

The doc specifies `{completed, lc_complete, fc_complete, waiting_for}` but the deployed RPC returns `{success, phase_advanced, current_phase, waiting_for}`. The frontend correctly reads the actual RPC shape (`result.phase_advanced`, `result.success`). No mismatch exists between RPC and frontend — only between doc and implementation naming.

## Single Remaining Fix: D10

Archive 17 legacy templates that have `NULL` document_code. These are harmless (the `check_legal_gate` RPC ignores them) but clutter the admin template list.

**Migration SQL:**
```sql
UPDATE legal_document_templates
SET is_active = false, updated_at = now()
WHERE document_code IS NULL AND is_active = true;
```

One migration, no frontend changes needed.

