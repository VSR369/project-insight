

# Legal Architecture V2 — Prompt 1: Database Migration

## What This Does
Creates the foundational database schema for the new 3-stakeholder legal model. Replaces the old 5-document structure (PMA, CA, PSA, IPAA, EPIA) with 3 platform agreements (SPA, SKPA, PWA) and adds freeze/lock infrastructure for challenge content integrity during legal review.

This is **database only** — no frontend changes.

---

## Current State
- `challenges` table: no freeze/lock columns exist
- `challenge_legal_docs` table: no content/assembly columns exist
- `legal_document_templates`: 5 active documents (PMA, CA, PSA, IPAA, EPIA)
- `document_code` column is plain TEXT (no CHECK constraint blocking new codes)
- RPCs `freeze_for_legal_review`, `unfreeze_for_recuration`, `assemble_cpa` do not exist
- Tables `audit_trail`, `geography_context`, `legal_acceptance_ledger` all exist
- `org_legal_document_templates` has `template_content` column (used by `assemble_cpa`)

---

## Migration Content (Single SQL file)

### Part A — Freeze/lock columns on `challenges`
- `curation_frozen_at TIMESTAMPTZ`
- `curation_frozen_by UUID` (FK to auth.users)
- `legal_review_content_hash TEXT`
- `curation_lock_status TEXT NOT NULL DEFAULT 'OPEN'` with CHECK constraint (OPEN/FROZEN/RETURNED)

### Part B — Content/assembly columns on `challenge_legal_docs`
- `content TEXT`, `content_html TEXT`
- `assembled_from_template_id UUID`
- `assembly_variables JSONB`
- `reviewer_notes TEXT`
- `is_assembled BOOLEAN NOT NULL DEFAULT false`
- `reviewed_by UUID`, `reviewed_at TIMESTAMPTZ`

### Part C — Deactivate old 5 documents, insert 3 new platform documents
- UPDATE to deactivate PMA, CA, PSA, IPAA, EPIA
- INSERT SPA, SKPA, PWA with appropriate descriptions
- Uses `ON CONFLICT DO NOTHING` for idempotency

### Part D — `freeze_for_legal_review(p_challenge_id, p_user_id)` RPC
- Validates challenge is Phase 2 and not already frozen
- Computes SHA-256 content hash from key fields using `pgcrypto`
- Sets lock status to FROZEN, records hash and timestamp
- Inserts audit trail entry

### Part E — `unfreeze_for_recuration(p_challenge_id, p_user_id, p_reason)` RPC
- Validates challenge is frozen
- Resets lock columns, sets phase back to 2
- Deletes assembled CPA docs (`is_assembled = true`)
- Inserts audit trail entry

### Part F — `assemble_cpa(p_challenge_id, p_user_id)` RPC
- Determines governance mode → picks `CPA_QUICK`/`CPA_STRUCTURED`/`CPA_CONTROLLED` template from `org_legal_document_templates`
- Looks up IP clause, escrow terms, anti-disintermediation clause
- Resolves geography context for jurisdiction/governing law
- Performs `{{variable}}` substitution on template content
- Falls back to generated default CPA if no template exists
- Inserts assembled doc into `challenge_legal_docs` with `is_assembled=true`
- Inserts audit trail entry

### Part G — Content protection trigger
- `trg_prevent_frozen_content_edit` — BEFORE UPDATE trigger on challenges
- Blocks modifications to content fields (title, problem_statement, scope, hook, ip_model, platinum_award, evaluation_criteria) when `curation_lock_status = 'FROZEN'`

### Part H — Ensure pgcrypto extension
- `CREATE EXTENSION IF NOT EXISTS pgcrypto`

---

## Frontend Type Updates (Minimal)
After migration executes, update `src/types/legal.types.ts`:
- Extend `DocumentCode` union to include `'SPA' | 'SKPA' | 'PWA' | 'CPA_QUICK' | 'CPA_STRUCTURED' | 'CPA_CONTROLLED'`
- Add corresponding entries to `DOCUMENT_CODE_LABELS`

---

## Files Changed

| File | Action |
|------|--------|
| New migration SQL | Create — all schema + functions + seed data |
| `src/types/legal.types.ts` | Edit — extend DocumentCode type and labels |

---

## What Comes Next (Not in this prompt)
- Prompt 2: Platform Admin UI (3 document cards)
- Prompt 3: Org Admin UI (3 CPA template cards)
- Prompt 4: Curator freeze + legal review
- Prompt 5: LC assembled CPA review
- Prompt 6: Integrity + pre-flight gate
- Prompt 7: Solver enrollment + PWA onboarding

Each subsequent prompt will be implemented one at a time after this migration is confirmed working.

