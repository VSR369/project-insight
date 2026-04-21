

# Plan — Drop legacy unique constraint blocking multiple SOURCE_DOC uploads

## Root cause (confirmed)

The legacy unique constraint `uq_challenge_legal_docs_type_tier` on `(challenge_id, document_type, tier)` is still on `challenge_legal_docs`. It was designed for the old per-document flow (one NDA, one CHALLENGE_TERMS, one IP_ASSIGNMENT per challenge). The new unified workflow requires **multiple `SOURCE_DOC` rows per challenge**, so the second upload always fails.

A previous attempt tried to replace this with a partial unique index, but the original constraint is still present in the live schema — that's why the error persists.

## Fix — single DB migration, no code changes

Create one new migration:

```sql
-- Drop the legacy unique constraint that blocks multiple SOURCE_DOC uploads.
-- The new unified workflow uses document_type='SOURCE_DOC' for ALL uploaded
-- source documents, so multiple rows per (challenge_id, document_type, tier)
-- are required.
ALTER TABLE public.challenge_legal_docs
  DROP CONSTRAINT IF EXISTS uq_challenge_legal_docs_type_tier;

-- Also drop any duplicate index left behind by the previous attempt so we
-- can re-create the partial unique index cleanly.
DROP INDEX IF EXISTS public.uq_challenge_legal_docs_unified_per_tier;

-- Keep one UNIFIED_SPA per (challenge, tier); allow unlimited SOURCE_DOC rows.
CREATE UNIQUE INDEX uq_challenge_legal_docs_unified_per_tier
  ON public.challenge_legal_docs (challenge_id, document_type, tier)
  WHERE document_type <> 'SOURCE_DOC';
```

Why both statements:
- `DROP CONSTRAINT IF EXISTS` removes the old hard constraint that's still blocking inserts.
- `DROP INDEX IF EXISTS` + `CREATE UNIQUE INDEX` makes the migration idempotent if the partial index from the previous attempt landed (or didn't).
- The partial index preserves the only invariant we still want: a single `UNIFIED_SPA` per challenge + tier.

## What is NOT changing

- No component changes (`LcSourceDocUpload`, `LcUnifiedAgreementCard`, `LcPass3ReviewPanel`, `Pass3EditorBody`, etc.).
- No hook changes (`useSourceDocs`, `useUploadSourceDoc`, `useOrganizeAndMerge`).
- No edge function changes (`suggest-legal-documents` already supports `organize_only` mode).
- No status trigger changes (`enforce_legal_doc_status` already accepts `uploaded`/`organized`/`accepted`/`ai_suggested`).
- No `ai_review_status` check-constraint changes (already accepts `organized`).
- No UI restructure (two-tab layout from the previous step stays as-is).

## Files touched

- `supabase/migrations/<new>_drop_legacy_unique_allow_multiple_source_docs.sql` — the SQL above.

## Verification

1. Upload doc #1 → succeeds.
2. Upload doc #2 → **succeeds** (this is the regression fix).
3. Upload doc #3 → succeeds; all three appear in the source list.
4. Click **Consolidate uploaded documents** → unified draft renders in the editor (`ai_review_status = organized`).
5. Click **Enhance with AI (optional)** → editor updates (`ai_review_status = ai_suggested`).
6. Click **Accept Legal Documents** → `accepted`, banner appears.
7. Attempt to insert a second `UNIFIED_SPA` for the same `(challenge_id, tier)` → still rejected by the partial unique index (invariant preserved).
8. `npx tsc --noEmit` — unchanged, no code touched.

## Out of scope

- Renaming `document_type` enum values.
- Any change to Pass 1 / Pass 2 / `complete_legal_review` RPC.
- Any change to QUICK auto-accept path.
- Any frontend change — explicitly avoided per the user's instruction.

