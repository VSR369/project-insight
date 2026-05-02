## Root cause

When clicking **Save & Continue** on the Organization Identity (Step 1) registration tab, the insert into `seeker_organizations` fails with:

> new row for relation "seeker_organizations" violates check constraint "seeker_organizations_governance_profile_check"

Investigation shows a contradictory schema state on `public.seeker_organizations.governance_profile`:

- **Column default**: `'LIGHTWEIGHT'::text` (legacy term)
- **NOT NULL**: yes
- **CHECK constraint** `seeker_organizations_governance_profile_check`:
  `governance_profile = ANY (ARRAY['QUICK','STRUCTURED','CONTROLLED'])`

The registration insert (`src/hooks/queries/useRegistrationData.ts` ~ line 353) intentionally does not set `governance_profile` (it is a Phase-2 governance decision, not a registration field). Postgres applies the default `'LIGHTWEIGHT'`, which immediately violates the CHECK constraint, so every new-org registration fails.

This is a schema drift left over from the standardized-naming refactor (see `mem://cogniblend/architecture/standardized-naming-and-terminology`) — the constraint was modernized but the column default was not.

## Fix

A single, additive migration to align the default with the constraint and repair any rows that already drifted.

### Migration

```sql
-- 1. Repair any pre-existing invalid values so the new default install
--    cannot fail and the column remains queryable safely.
UPDATE public.seeker_organizations
SET governance_profile = 'QUICK'
WHERE governance_profile NOT IN ('QUICK','STRUCTURED','CONTROLLED');

-- 2. Replace the legacy default with the canonical entry-tier value.
ALTER TABLE public.seeker_organizations
  ALTER COLUMN governance_profile SET DEFAULT 'QUICK';
```

`'QUICK'` is the correct entry default per the project's standardized terminology (QUICK = Express tier, the lowest-rigor profile new orgs start on; they can be promoted to STRUCTURED/CONTROLLED later via the curator/admin governance flow).

### Why no app-code change

- `useRegistrationData.useCreateOrganization` is correct as written — registration must NOT decide governance posture for the org. Passing `governance_profile` from the wizard would violate the principle that mode is set later by the platform/curator (see `mem://cogniblend/governance/mode-resolution-and-normalization-policy`).
- The `seeker_organizations_governance_profile_check` constraint stays as is — it is the authoritative allowed set.

### Verification

After the migration:
1. Reload `/registration/organization-identity`, fill the form, click **Save & Continue** — the insert succeeds and the wizard advances to Step 2.
2. `SELECT governance_profile FROM seeker_organizations ORDER BY created_at DESC LIMIT 1` returns `QUICK`.
3. No app code changes; existing org rows that were already valid are untouched.

## Out of scope

- The unrelated `DialogContent` a11y warnings and the `Select uncontrolled→controlled` warning shown in console — separate hygiene items, not blockers for this tab.
