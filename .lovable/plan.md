

## Sprint 2 — Pass 3 Backend (Database + Edge Function)

### Part A — Single migration

| # | Change | Notes |
|---|---|---|
| A1 | `CREATE TABLE ai_legal_review_config` | 11 columns + RLS + 2 policies (public read, supervisor manage). Uses `admin_tier IN ('supervisor','senior_admin')` against `platform_admin_profiles` — column exists, verified. |
| A2 | Seed 11 rows (`ON CONFLICT (section_key) DO NOTHING`) | All 11 SPA sections with system_prompt, required_context_keys, regulatory_frameworks. Section 9 (`anti_disintermediation`) → `applies_to_engagement = 'AGGREGATOR'`, `anti_disintermediation_required = true`. |
| A3 | `ALTER challenge_legal_docs ADD COLUMN IF NOT EXISTS` × 6 | `ai_modified_content_html`, `ai_changes_summary`, `ai_review_status` (CHECK: pending/ai_suggested/accepted/rejected/stale), `ai_confidence` (CHECK: high/medium/low), `ai_regulatory_flags JSONB '[]'`, `pass3_run_count INTEGER 0`. All nullable / safely defaulted — no impact on existing rows. |
| A4 | `ALTER md_governance_mode_config ADD COLUMN lc_review_timeout_days INTEGER NOT NULL DEFAULT 7` | Defaults all existing rows to 7. |

Note: existing `status` CHECK on `challenge_legal_docs` already permits `'ai_suggested'` (current code uses it), so no constraint change needed there.

### Part B — Edge function `suggest-legal-documents`

Current file: 333 lines. Adding Pass 3 inline would exceed the 500-line cap once the system-prompt builder, context flattening, persistence, and tool schema are added. **Will extract Pass 3 into a sibling file** to stay safely under the limit.

**File 1 — `supabase/functions/suggest-legal-documents/pass3Handler.ts`** (NEW, ~280 lines)
Exports `handlePass3({ supabaseAdmin, userId, challengeId, lovableApiKey })` returning a `Response`. Responsibilities:
1. `buildUnifiedContext(challengeId, 'pass3-' + Date.now())` for full grounded context.
2. Resolve engagement (`MARKETPLACE`/`AGGREGATOR`) + governance (`QUICK`/`STRUCTURED`/`CONTROLLED`) from context.
3. Query `ai_legal_review_config` where `is_active = true`, then in-memory filter by `applies_to_engagement IN ('BOTH', engagement)` and `applies_to_governance IN ('ALL', governance)`, ordered by `section_order`. Drop `anti_disintermediation` if engagement ≠ AGGREGATOR.
4. Load existing `challenge_legal_docs` for this challenge where `status != 'ai_suggested'` (template content to enhance, not regenerate from blank).
5. Build a single system prompt: legal-counsel persona + per-section instructions + CSS-class formatting rules (`<div class="legal-doc"> <h2> <ol><li>`) + grounding instructions referencing real challenge fields.
6. Build a single user prompt with: full context JSON (truncated to relevant keys), section list, existing template content, and the unified-output requirement.
7. `callAIWithFallback` — single call, `max_tokens: 16384`, tool `generate_unified_spa` returning `{ unified_document_html, sections[], overall_summary }`.
8. Standard 429 / 402 / non-OK handling matching existing code.
9. Persistence:
   - Delete prior `ai_suggested` / `stale` rows for this challenge with `document_type = 'UNIFIED_SPA'`.
   - Compute `ai_confidence` as the lowest across sections (low > medium > high precedence).
   - Compute `ai_regulatory_flags` as deduped union across sections.
   - `INSERT` one row: `document_type='UNIFIED_SPA'`, `document_name='Solution Provider Agreement'`, `tier='TIER_1'`, `status='ai_suggested'`, `ai_review_status='ai_suggested'`, `content_html` + `ai_modified_content_html` = unified HTML, `ai_changes_summary = overall_summary`, `ai_confidence`, `ai_regulatory_flags`, `pass3_run_count = COALESCE(prior, 0) + 1` (read prior count first), `maturity_level` from challenge, `created_by = user.id`, `attached_by = user.id`.
10. Return `{ success: true, data: { unified_document_html, sections, overall_summary, ai_confidence, ai_regulatory_flags } }`.

**File 2 — `supabase/functions/suggest-legal-documents/index.ts`** (MODIFIED, will end ~345 lines)
- Add `import { handlePass3 } from "./pass3Handler.ts";` at top.
- Change `const { challenge_id } = await req.json();` → `const { challenge_id, pass3_mode } = await req.json();`.
- Immediately after the `challenge_id` validation and `adminClient` creation, add **before** the existing `challenges` SELECT:
  ```ts
  if (pass3_mode === true) {
    return await handlePass3({
      supabaseAdmin: adminClient,
      userId: user.id,
      challengeId: challenge_id,
      lovableApiKey: LOVABLE_API_KEY,
    });
  }
  ```
- **Every other line untouched** — when `pass3_mode` is `false`/`undefined`, the original code path runs byte-identically.

### Backward compatibility guarantee

`LcLegalWorkspacePage.tsx` line 333 sends `{ challenge_id }` only. `pass3_mode` is `undefined`, the new `if` block is skipped, and execution falls through to the original 180+-line legacy flow with zero behavioral change.

### Constraints met

- Function not renamed; route path identical.
- No frontend file touched.
- No changes to `buildUnifiedContext.ts` or `aiModelConfig.ts`.
- `index.ts` stays under 500 lines; Pass 3 logic isolated in `pass3Handler.ts` (also under 300 lines).
- Migration is single new file, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- RLS enabled with two policies; supervisor check uses verified `admin_tier` column.

### Validation after deploy

```sql
SELECT count(*) FROM ai_legal_review_config;                               -- 11
SELECT section_key FROM ai_legal_review_config WHERE anti_disintermediation_required;  -- anti_disintermediation
SELECT column_name FROM information_schema.columns
 WHERE table_name='challenge_legal_docs' AND column_name LIKE 'ai_%';      -- 5 rows
SELECT lc_review_timeout_days FROM md_governance_mode_config;              -- all 7
```

Manual: legacy LC button "Generate Legal Docs" → still creates separate suggestions. New call with `{challenge_id, pass3_mode:true}` → single `UNIFIED_SPA` row in `challenge_legal_docs` with `ai_review_status='ai_suggested'`.

### Out of scope

- No frontend wiring (Sprint 3/4).
- No changes to `assemble_cpa` RPC or other legal RPCs.
- No new `ai_legal_review_config` admin UI.
- No backfill of `ai_review_status` for existing rows (default `'pending'` applies on new inserts only; existing rows simply get `NULL` which is fine since column is nullable in CHECK with default).

