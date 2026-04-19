

## Sprint 0 — Database Lifecycle Fix (Plan)

### Verified state of the database

| Item | Current | Target | Notes |
|---|---|---|---|
| `complete_phase` line 133 | `v_legal_doc_mode = 'formal_approval'` | `'ai_review'` | Bug confirmed — value not in CHECK constraint, branch never fires |
| `complete_phase` line 137 | `v_escrow_mode = 'mandatory_escrow'` | `'mandatory'` | Bug confirmed — value not in CHECK constraint, escrow never created |
| `md_governance_mode_config` STRUCTURED row | `ai_legal_review_enabled = false` | `true` | Enables Pass 3 prep |
| `auto_assign_roles_on_creation` STRUCTURED | `ARRAY['CR','LC']` | `ARRAY['CR']` | LC stays with Curator, not Creator |
| `md_lifecycle_phase_config` STRUCTURED P3 | `auto_complete = false`, `required_role = 'CU'` | `auto_complete = true` | Curator already absorbs LC/FC in STRUCTURED, so P3 should cascade |
| LC/FC auto-assign on CONTROLLED Phase 3 entry | not present | present | New block inside Phase 3 setup |

### One discrepancy with the user's prompt to flag

The prompt assumes `auto_assign_challenge_role(p_challenge_id, p_role_code, p_assigned_by)` (3 args). The **actual deployed signature** is:

```
auto_assign_challenge_role(
  p_challenge_id uuid,
  p_pool_member_id uuid,
  p_user_id uuid,
  p_slm_role_code text,
  p_governance_role_code text,
  p_assigned_by uuid,
  p_assignment_phase text
)
```

It needs a **pool member already selected** — it does not pick a member itself. So calling it the way the prompt suggests would always fail. I will keep the spirit of Bug Fix 4 by:

1. Adding a small lookup that picks the next eligible pool member for `LC` (R9) and `FC` (R8) using `getPoolCodesForGovernanceRole` logic inline, then
2. Calling the real 7-arg signature, all wrapped in a `BEGIN…EXCEPTION WHEN OTHERS THEN NULL` so a pool miss never breaks the phase transition.

If no eligible pool member exists, the block becomes a no-op (logged as a skip in `audit_trail`), and a human admin assigns the role manually later — no regression.

### What the migration will contain (single new file)

1. **`CREATE OR REPLACE FUNCTION public.complete_phase`** with:
   - Line 133 condition fixed (`'ai_review'`)
   - Line 137 condition fixed (`'mandatory'`)
   - New CONTROLLED LC/FC pool auto-assignment block immediately after the `lc_review_required = TRUE` line, using the real 7-arg signature with a safe pool-pick subquery and a `BEGIN/EXCEPTION` wrapper
   - Same signature `(p_challenge_id uuid, p_user_id uuid)`, same `RETURNS jsonb`, same `SECURITY DEFINER`, same `SET search_path = public`
   - Every other line preserved verbatim (QUICK path untouched)

2. **`CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation`** with:
   - STRUCTURED branch changed from `ARRAY['CR','LC']` to `ARRAY['CR']`
   - Same signature, return type, security
   - QUICK and CONTROLLED branches preserved verbatim

3. **`UPDATE md_governance_mode_config SET ai_legal_review_enabled = true WHERE governance_mode = 'STRUCTURED';`**

4. **`UPDATE md_lifecycle_phase_config SET auto_complete = true WHERE governance_mode = 'STRUCTURED' AND phase_number = 3;`**

### Guarantees

- **Single new migration file** — no edits to any prior migration.
- **Zero frontend changes** — no `.tsx` / `.ts` touched.
- **QUICK code path bit-identical** — the only QUICK-relevant change is removing the false-`'mandatory_escrow'` branch which never executed for QUICK anyway (`v_escrow_mode = 'not_applicable'` for QUICK).
- **No types regeneration risk** — function signatures and return types are byte-identical to current.
- **Idempotent** — re-running the migration is safe (CREATE OR REPLACE + UPDATE WHERE).

### Post-migration validation queries

```sql
-- Should return ai_legal_review_enabled = true
SELECT governance_mode, ai_legal_review_enabled
FROM md_governance_mode_config WHERE governance_mode = 'STRUCTURED';

-- Should return auto_complete = true
SELECT governance_mode, phase_number, auto_complete
FROM md_lifecycle_phase_config
WHERE governance_mode = 'STRUCTURED' AND phase_number = 3;

-- Confirm STRUCTURED Creator no longer gets LC
-- (manual: create a STRUCTURED challenge, inspect user_challenge_roles for the creator)
```

### Out of scope (explicitly)

- No change to `auto_assign_challenge_role` itself.
- No change to `md_governance_mode_config` CHECK constraints.
- No change to Phase 2 logic, harmonization, repair-malformed-sections, or any AI edge function.
- Creator Legal Instructions creator-form gate (still tracked separately).

### Risk register

| Risk | Mitigation |
|---|---|
| LC/FC pool empty on CONTROLLED Phase 3 entry | Wrapped in `EXCEPTION WHEN OTHERS THEN NULL`; phase transition still succeeds; human admin assigns later |
| `auto_assign_challenge_role` signature changes in future | Block is fully self-contained inside one IF; future change touches only that block |
| Existing CONTROLLED challenges already past Phase 3 | Migration only affects future transitions; no backfill needed |
| STRUCTURED P3 cascade now skipping a step a curator expected to act on | STRUCTURED P3 has `lc_compliance_complete + fc_compliance_complete` already auto-set TRUE during P2, so there's nothing for a human to do at P3 — auto_complete is the correct semantics |

After approval I will write the single migration file and submit it via the migration tool. No other files touched.

