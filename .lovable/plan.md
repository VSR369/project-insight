## Migration (PROMPT 1) ✅
- Created `md_lifecycle_phase_config` table with 30 seed rows (10 phases × 3 modes)
- Config-driven RPCs: `get_phase_required_role`, `get_phase_config`, rewrite `complete_phase`
- `auto_assign_roles_on_creation` RPC update (QUICK=all, STRUCTURED=CR+LC, CONTROLLED=CR)
- `complete_legal_review` and `complete_financial_review` RPCs (now Phase 3)
- Pool email unique constraint fix

## Frontend Phase Refs (PROMPT 2) ✅
- `useSubmitSolutionRequest.ts`: CU auto-assign at phase >= 2, skip QUICK
- `CurationQueuePage.tsx`: Filter `.in("current_phase", [2])`, updated badges/tooltips
- `LcLegalWorkspacePage.tsx`: Removed CU auto-assign (curation before compliance now)
- `LegalDocumentAttachmentPage.tsx`: Same removal
- `CurationActions.tsx`: After curation approval, auto-assign LC+FC for CONTROLLED
- `useCompletePhase.ts`: Publication detection at phase 4/5

## Seed Fix (PROMPT 3) ✅
- Phase label: "COMPLIANCE" → "CURATION" in setup-test-scenario
- Edge function redeployed

## Admin Page (PROMPT 4) ✅
- `LifecyclePhaseConfigPage.tsx` — tabs shell
- `LifecyclePhaseTable.tsx` — table per mode
- `LifecyclePhaseRow.tsx` — editable row
- `useLifecyclePhaseConfig.ts` — query + mutation hooks (raw PostgREST)
- Added sidebar entry + route in App.tsx
