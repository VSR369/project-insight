
# Fix: Creator → Curator Pipeline + Legal Integration (5 Bugs) — COMPLETED

## Bugs Fixed

| Bug | Fix | File(s) |
|-----|-----|---------|
| B1 | `complete_legal_review` RPC sets `lc_compliance_complete = TRUE` | Migration |
| B2 | LcLegalWorkspacePage now calls `complete_legal_review` RPC instead of direct UPDATE | LcLegalWorkspacePage.tsx |
| B3 | LegalDocumentAttachmentPage uses `complete_legal_review` RPC instead of `completePhase.mutate` | LegalDocumentAttachmentPage.tsx |
| B4 | CU auto-assignment only triggers when `current_phase >= 3` | useSubmitSolutionRequest.ts, LcLegalWorkspacePage.tsx, LegalDocumentAttachmentPage.tsx |
| B5 | CA legal gate modal added to ChallengeCreatorForm submit flow | ChallengeCreatorForm.tsx |

## Migration

- `complete_legal_review(p_challenge_id, p_user_id)` — SECURITY DEFINER RPC
- `complete_financial_review(p_challenge_id, p_user_id)` — SECURITY DEFINER RPC

Both set their respective compliance flag, log audit, and auto-advance to Phase 3 if both flags are TRUE.
