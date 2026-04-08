
You are right — based on the screen you shared, Quick mode is not displaying any read-only legal-doc card on the actual page.

What I verified
- `/cogni/challenges/create` is wired to `ChallengeCreatePage` and then `ChallengeCreatorForm`.
- `ChallengeCreatorForm.tsx` is supposed to render `CreatorLegalDocsPreview` for all modes, plus `SolverAudiencePreview` in Quick mode.
- The database already has ACTIVE templates that should appear in Quick mode: PMA, CA, PSA, and IPAA. EPIA is CONTROLLED-only.
- `QuickLegalDocsSummary.tsx` exists, but it is not currently wired into the page.
- Your screenshot shows only the Solver Audience card, which means the legal-doc card is not rendering in the runtime you are actually seeing.
- The preview request snapshot did not show a `legal_document_templates` fetch, which supports that the legal preview path is not mounting in the live screen.

What is actually stopping it
- This is no longer just a data/filter issue.
- The current source says the legal preview should render, but the runtime screen still behaves like an older/alternate path where that first card is missing.
- So the real problem is Quick-mode rendering/wiring drift on the create screen.

Implementation plan
1. Trace the exact Quick-mode render path
   - Verify the active `/cogni/challenges/create` screen is using the same `ChallengeCreatorForm.tsx` that contains `CreatorLegalDocsPreview`.
   - Check for any legacy/parallel Quick-mode branch that bypasses the legal preview.

2. Make Quick mode impossible to hide
   - Update the Quick-mode section so a legal-doc card always renders.
   - Use `QuickLegalDocsSummary.tsx` as a guaranteed fallback, or fold that fallback directly into `CreatorLegalDocsPreview`.
   - Ensure Quick mode never returns `null` or disappears silently.

3. Use one source of truth for previewed docs
   - Align the Quick read-only preview with the same legal-resolution logic used by `LegalGateModal` / `useLegalGate`.
   - This prevents drift between “what the user sees before submit” and “what actually applies on submit.”

4. Keep the content read-only
   - Preserve document viewing through `LegalDocumentViewer`.
   - Show the list of agreements with read-only badges and a View action for full text.

5. Verify Quick mode end-to-end
   - Confirm the legal-doc card is visible before submit in Quick mode.
   - Confirm MP and AGG show PMA, CA, PSA, and IPAA.
   - Confirm EPIA does not appear in Quick mode.
   - Confirm the same docs are used by the submission legal flow.

Files to update
- `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- `src/components/cogniblend/creator/CreatorLegalDocsPreview.tsx`
- `src/components/cogniblend/creator/QuickLegalDocsSummary.tsx`
- optionally `src/hooks/queries/useLegalDocTemplates.ts` or shared legal-gate resolver if unified

Technical details
- The database is not the blocker.
- The strongest evidence is your screenshot: only the second Quick-mode card (`SolverAudiencePreview`) is visible, so the first card slot is missing in the live UI.
- That means the fix now needs to target render-path consistency, not just query filtering.
