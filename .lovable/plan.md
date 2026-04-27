## Add missing Prompt 1 test file

Create `src/services/legal/__tests__/roleToDocumentMap.test.ts` to validate the R2 → [SKPA, RA_R2] mapping and signature derivation priority (`SPA > SKPA > RA_R2 > PWA`) shipped in Phase 9 v4 — Prompt 1.

### What the test will cover
- `R2` resolves to `[SKPA, RA_R2]` (and not legacy single-doc).
- Other roles (R3–R10) keep their current mappings.
- `deriveRequiredSignatureDocs` returns the highest-priority doc per priority array.
- Edge cases: empty role list, duplicate roles, unknown role codes.

### Files
- **Created**: `src/services/legal/__tests__/roleToDocumentMap.test.ts`

### Verification
- Run `bunx vitest run src/services/legal/__tests__/roleToDocumentMap.test.ts`.
- Confirm full legal suite remains green (target: 60 → 60+N tests passing).
