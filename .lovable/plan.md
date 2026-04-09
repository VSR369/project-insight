

## Plan: Creator Legal Preview + Instructions + Seed Updates

### Summary
Create a new `CreatorLegalPreview` component showing solver-facing CPA/SPA preview, add a `creator_legal_instructions` text field for Creator→Curator/LC guidance, remove the legacy `LegalGateModal` from submit flow, and update seed/fill-test-data.

---

### Part A — Database Migration
Add `creator_legal_instructions TEXT` column to `challenges` table.

### Part B — Create `src/components/cogniblend/creator/CreatorLegalPreview.tsx` (~180 lines)
- Props: `governanceMode`, `organizationId?`
- Reuses `useOrgCpaTemplates(organizationId)` filtered to `CPA_{governanceMode}`
- Small inline `useQuery` for platform SPA from `legal_document_templates`
- Layout: Header → CPA card (color-coded by mode, View Template dialog) → Addendum note (STRUCTURED/CONTROLLED) → Creator Legal Instructions textarea (STRUCTURED/CONTROLLED only, RHF Controller, 2000 char limit) → Footer → SPA footnote
- Missing CPA template shows amber warning
- View dialog reuses `LegalDocumentViewer`

### Part C — Modify `ChallengeCreatorForm.tsx`
- Remove imports: `CreatorLegalDocsPreview`, `QuickLegalDocsSummary`, `LegalGateModal`
- Add import: `CreatorLegalPreview`
- Remove: `showLegalGate`, `pendingSubmitData` state, `handleLegalAccepted` callback, `LegalGateModal` render block
- Replace legal display section (lines 248-255) with `<CreatorLegalPreview governanceMode={governanceMode} organizationId={currentOrg?.organizationId} />`
- Merge submit flow: `handleSubmit` calls `executeSubmit(data)` directly (no legal gate intermediary), preserving file upload chain

### Part D — Schema + Payload updates
- `creatorFormSchema.ts`: Add `creator_legal_instructions: z.string().max(2000).optional().default('')` to schema, add to `CreatorFormValues` type
- `challengePayloads.ts`: Add `creatorLegalInstructions?: string` to `DraftPayload`, add `creator_legal_instructions: fp.creatorLegalInstructions || null` to `buildChallengeUpdatePayload`
- `useCreatorDraftSave.ts`: Add `creatorLegalInstructions: data.creator_legal_instructions || undefined` to base payload
- `ChallengeCreatorForm.tsx` `buildPayload`: Add `creatorLegalInstructions` field

### Part E — Curation section for Creator Legal Instructions
- `curationSectionDefs.tsx`: Add `creator_legal_instructions` section before `legal_docs` with amber-styled render. Add key to "6. Publish" group.
- `useCurationPageData.ts`: Append `creator_legal_instructions` to challenge `.select()` string (line 183)

### Part F — Update seed data
- `supabase/functions/_shared/setup-test-scenario-data.ts`: Add `creator_legal_instructions` to each challenge insert (domain-specific text for CONTROLLED/STRUCTURED, null for QUICK)

### Part G — Update fill test data
- `creatorSeedContent.ts`: Add `creator_legal_instructions` to `SeedContent` type, `MP_SEED`, `AGG_SEED`, and `getSeedForCombination` overrides per governance mode

### Files touched
1. **New migration** — `ALTER TABLE challenges ADD COLUMN creator_legal_instructions`
2. **New file** — `src/components/cogniblend/creator/CreatorLegalPreview.tsx`
3. **Edit** — `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
4. **Edit** — `src/components/cogniblend/creator/creatorFormSchema.ts`
5. **Edit** — `src/lib/cogniblend/challengePayloads.ts`
6. **Edit** — `src/hooks/cogniblend/useCreatorDraftSave.ts`
7. **Edit** — `src/lib/cogniblend/curationSectionDefs.tsx`
8. **Edit** — `src/hooks/cogniblend/useCurationPageData.ts`
9. **Edit** — `src/components/cogniblend/creator/creatorSeedContent.ts`
10. **Edit** — `supabase/functions/_shared/setup-test-scenario-data.ts`

Old files (`CreatorLegalDocsPreview.tsx`, `QuickLegalDocsSummary.tsx`, `LegalGateModal.tsx`) kept in place — imports removed only from `ChallengeCreatorForm`.

