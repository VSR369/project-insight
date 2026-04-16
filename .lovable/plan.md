

## 5-Why Analysis

1. **Why does the preview fail?** PostgREST returns "more than one relationship was found for 'challenges' and 'seeker_organizations'".
2. **Why is the relationship ambiguous?** The `challenges` table has TWO foreign keys to `seeker_organizations`: `challenges_organization_id_fkey` (organization_id) and `challenges_tenant_id_fkey` (tenant_id).
3. **Why didn't PostgREST pick one?** The query in `usePreviewData.ts` uses `seeker_organizations!inner(...)` without specifying which FK to embed through. PostgREST refuses to guess.
4. **Why is `tenant_id` a FK to seeker_organizations?** Multi-tenancy convention — every business table's `tenant_id` references the owning org. This is correct and must stay.
5. **Why is this the only hook that breaks?** Every other hook in the codebase already uses the explicit hint `seeker_organizations!challenges_organization_id_fkey(...)`. `usePreviewData.ts` is the only file using the implicit `!inner` form — this is the lone divergence from the established pattern.

**Root cause:** Single inconsistent embed in `src/components/cogniblend/preview/usePreviewData.ts` line 65.

## Permanent Fix

**One-line change** in `src/components/cogniblend/preview/usePreviewData.ts`:

Replace:
```ts
seeker_organizations!inner(
```
with:
```ts
seeker_organizations!challenges_organization_id_fkey(
```

This matches the canonical pattern used by `useCurationPageData`, `usePublicChallenge`, `useBrowseChallenges`, and `useSolutionRequests`.

## Why This Is "Permanent"

- Aligns the preview hook with the existing project-wide convention — no special casing.
- The `!inner` join semantic is preserved implicitly because `organization_id` is NOT NULL on challenges in practice (and the preview only loads after Phase 1 where org is set). If we want to keep strict inner-join semantics, we can keep `!inner` plus the hint: `seeker_organizations!challenges_organization_id_fkey!inner(...)` — but a review of the other hooks shows none use `!inner`, so we'll match the project standard (plain hint, no `!inner`).
- No migration, no schema change, no RLS change. Single-file edit.

## Verification After Fix

1. Reload `/cogni/curation/:id/preview` — the alert should disappear and the document renders.
2. Confirm `data.orgData` populates (organization name shown in preview header/sections).
3. Quick grep to ensure no other file still uses the implicit embed against `seeker_organizations` without an FK hint.

## Files Changed

- `src/components/cogniblend/preview/usePreviewData.ts` (1 line)

