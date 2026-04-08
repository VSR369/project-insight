
I checked the creator screen wiring, the live request, and the database.

Do I know what the issue is?
Yes.

What is actually stopping the legal documents from appearing:
1. `ChallengeCreatorForm` is rendering `CreatorLegalDocsPreview`, so the UI slot exists.
2. The database is fine: there are 5 readable ACTIVE templates with content (PMA, CA, PSA, IPAA, EPIA), and RLS is not blocking them.
3. The live preview request is still hitting `legal_document_templates?...version_status=eq.published`, which returns `[]`.
4. `CreatorLegalDocsPreview` then does `if (docs.length === 0) return null`, so the entire section disappears and you see nothing.

Implementation plan:
1. Fix the creator legal-doc fetch path
   - Make the creator preview use the ACTIVE-status query path only.
   - Remove drift between `useLegalDocTemplates.ts` and `useLegalDocumentTemplates.ts` by sharing one source of truth/helper for legal-template fetching.
2. Harden the filter mapping
   - Normalize creator values before filtering: `MP -> MARKETPLACE`, `AGG -> AGGREGATOR`.
   - Keep wildcard support for `BOTH/ALL`.
   - Keep governance matching for `QUICK / STRUCTURED / CONTROLLED`.
3. Stop hiding the section
   - Update `CreatorLegalDocsPreview.tsx` so it always renders a read-only card.
   - Add proper loading, error, and empty states instead of returning `null`.
   - In the empty state, show why no documents matched the current governance mode / engagement model.
4. Keep it strictly read-only
   - Continue using `LegalDocumentViewer` for modal viewing only.
   - No edit controls in the creator flow.
5. Verify on the create screen
   - Test MP + AGG across QUICK / STRUCTURED / CONTROLLED.
   - Confirm PMA, CA, PSA, and IPAA appear where applicable.
   - Confirm EPIA appears only for CONTROLLED.

Files to update:
- `src/hooks/queries/useLegalDocTemplates.ts`
- `src/components/cogniblend/creator/CreatorLegalDocsPreview.tsx`
- optional shared legal-template helper/query module to prevent future drift

Technical note:
This is not a missing-data problem. The blocker is the creator preview still using the wrong query path in the running screen, combined with a component that silently renders nothing when the query returns no rows.
