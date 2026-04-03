## Migration (PROMPT 1)
- Create `md_lifecycle_phase_config` table with 30 seed rows (10 phases × 3 modes)
- Config-driven RPCs: `get_phase_required_role`, `get_phase_config`, rewrite `complete_phase`
- `auto_assign_roles_on_creation` RPC update
- `complete_legal_review` and `complete_financial_review` RPCs (now Phase 3)
- Pool email unique constraint fix

## Frontend Phase Refs (PROMPT 2)
- `useSubmitSolutionRequest.ts`: CU auto-assign at phase >= 2 (not 3)
- `CurationQueuePage.tsx`: Filter `.in("current_phase", [2])`, update badges
- `LcLegalWorkspacePage.tsx`: Phase 3 references
- `LegalDocumentAttachmentPage.tsx`: Phase 3 references
- `CurationActions.tsx`: After curation approval, auto-assign LC+FC for CONTROLLED
- `useCompletePhase.ts`: Update phase 7 reference for publication

## Seed Fix (PROMPT 3)
- Phase label: "SPEC_REVIEW" → "CURATION"
- Pool entries already use SELECT+INSERT/UPDATE pattern (done previously)

## Admin Page (PROMPT 4)
- `LifecyclePhaseConfigPage.tsx` — tabs shell (<80 lines)
- `LifecyclePhaseTable.tsx` — table per mode (<150 lines)
- `LifecyclePhaseRow.tsx` — editable row (<100 lines)
- `useLifecyclePhaseConfig.ts` — query + mutation hooks
- Add sidebar entry + route in App.tsx
