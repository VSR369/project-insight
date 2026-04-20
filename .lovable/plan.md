

## 5 Whys Root Cause Analysis — "Failed to assemble CPA"

**Symptom (from console logs):**
```
record "v_geo" is not assigned yet — code 55000
operation: assemble_cpa, challenge_id: 25ca71a0-…
```

| # | Why? | Answer |
|---|---|---|
| 1 | Why does Send-to-Legal fail? | The `assemble_cpa` RPC throws Postgres error `55000`. |
| 2 | Why error 55000? | Code references `v_geo.region_name` and `v_geo.laws` when the `v_geo` RECORD was never populated. |
| 3 | Why was `v_geo` never populated? | The `SELECT … INTO v_geo FROM geography_context gc JOIN countries co …` returns **zero rows** for this org (no `hq_country_id` match, or no matching geography_context row). |
| 4 | Why does the existing safety net fail? | The `EXCEPTION WHEN OTHERS THEN v_geo := NULL` block is never entered — `SELECT … INTO` does **not** raise an exception when zero rows are returned; it leaves the RECORD **un-assigned** (no tuple structure). Assigning `NULL` to an un-typed RECORD doesn't help either — the next field-access still trips error 55000. |
| 5 | Why was this not caught earlier? | The function was tested with seeded orgs that had `hq_country_id` populated and a matching `geography_context` row. Real curated challenges (incl. challenge `25ca71a0…`) hit the empty-result path that was never exercised. |

**Root cause (one line):**  
PL/pgSQL `RECORD` cannot be safely null-coalesced. The function reads `v_geo.region_name` even when no geography row exists, raising 55000 and aborting the entire assembly — so no CPA is written, no freeze is published, LC/FC see nothing.

This has nothing to do with preview data freshness — the curated content **is** current; the assembly aborts before it can be persisted.

---

## Permanent Fix — Single migration, single function, no UI/RLS/AI ripple

### Strategy
Replace the unsafe `RECORD` pattern with **scalar variables** that default to safe fallbacks. Same logic, same output schema, same callers — just bullet-proof against missing geography.

### SQL change (one new migration)

```sql
CREATE OR REPLACE FUNCTION public.assemble_cpa(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  -- … unchanged …
  v_geo_region TEXT := 'Applicable jurisdiction';   -- ← scalar with default
  v_geo_laws   TEXT := 'As per applicable regulations';
BEGIN
  -- … unchanged up to geography lookup …

  BEGIN
    SELECT gc.region_name,
           array_to_string(gc.data_privacy_laws, ', ')
      INTO v_geo_region, v_geo_laws
    FROM geography_context gc
    JOIN countries co ON gc.country_codes @> ARRAY[co.code]
    WHERE co.id = v_org.hq_country_id
    LIMIT 1;
    -- If 0 rows: defaults retained. No exception, no record-not-assigned.
  EXCEPTION WHEN OTHERS THEN
    -- table missing or any other failure → keep defaults
    NULL;
  END;

  -- Replace every v_geo.region_name → v_geo_region
  -- Replace every v_geo.laws        → v_geo_laws
  -- (3 occurrences total: lines 214, 215, 255)

  -- … rest of function unchanged …
END;
$function$;
```

That's the only structural change. Everything else (variable assembly, INSERT into `challenge_legal_docs`, audit_trail row, return shape) stays byte-identical.

### Why this is the minimal, correct fix
- Scalars have a defined NULL state; `COALESCE` works correctly on them.
- Defaults are applied **before** the SELECT, so even if the SELECT writes nothing, the variables are valid.
- No schema change, no new table, no RLS edit, no migration to data.
- `assemble_cpa` is called from exactly one place (`useAssembleCpa` → `LegalReviewPanel` "Send to Legal"). Output contract unchanged → no client/UI change required.

### What this does NOT touch
- AI Pass 1 / Pass 2 / autosave — untouched.
- Curation lifecycle (`complete_phase`, `freeze_for_legal_review`, `unfreeze_for_recuration`) — untouched.
- RLS, RPCs other than `assemble_cpa` — untouched.
- Preview page, curation queue, LC/FC queues — untouched.
- SPA / PWA / role classification (just shipped) — untouched.
- `challenge_legal_docs` rows already in the table — untouched.

### Reuse-of-Preview-data question
Verified: Preview reads from the same `challenges` row + `challenge_legal_docs` + `escrow_records` + `challenge_attachments` that `assemble_cpa` already consumes. There is **no staleness gap** — the data is the same row. The "Preview is fresh" intuition is correct; the assembly *was already* using the latest row but crashing on geography lookup. So no preview-snapshot plumbing is needed; fixing `v_geo` makes the existing flow pass through cleanly with the latest curated content + linked attachments.

### Test gates (after migration deploys)
1. Open challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b` → Curation Workspace.
2. Click **Freeze for Legal Review** → toast `Challenge frozen for legal review`. DB: `curation_lock_status='FROZEN'`.
3. Click **Assemble CPA** → toast `CPA assembled successfully`. DB: a new row in `challenge_legal_docs` where `is_assembled=true`, `document_type='CPA_<MODE>'`, `content` populated with curated title/scope/IP/prize/jurisdiction (defaulted gracefully if no geography row).
4. Open `/cogni/curation/<id>/preview` → CPA section renders the assembled content.
5. Login as **Legal Coordinator** → CPA appears in LC queue with status `pending_review` (or `approved` for QUICK mode).
6. Login as **Finance Coordinator** → escrow + assembled doc visible in FC queue (CONTROLLED only).
7. Repeat for a challenge **with** geography_context populated → jurisdiction/governing_law fields show real values, not defaults (regression check).
8. AI Pass 1 + Pass 2 + autosave smoke test on a different challenge (no regression).

### Files touched
| File | Change |
|---|---|
| `supabase/migrations/<new_timestamp>_fix_assemble_cpa_v_geo.sql` | New migration — `CREATE OR REPLACE FUNCTION public.assemble_cpa(...)` with scalar geography vars |

**No application code, no hooks, no components touched.** Single migration, fully reversible by re-running the prior migration.

