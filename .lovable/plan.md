
# Follow-up: Hardening + Cleanup (3 items approved)

Implements the three open decisions from the previous plan.

## 1. Retire `/org/challenges/create` — redirect to Cogni wizard

Replace the 367-line `src/pages/org/ChallengeCreatePage.tsx` with a one-line `<Navigate to="/cogni/challenges/create" replace />`. This preserves every existing deep-link (sidebar, OnboardingComplete, ChallengeListPage empty state, OrgDashboard CTA) without touching any of them.

Keeps the legacy form's import graph (`useCreateChallenge`, `EngagementModelSelector`, etc.) intact in case other surfaces need it later.

**File:** `src/pages/org/ChallengeCreatePage.tsx` (rewrite as redirect stub)

## 2. DELEGATED admin = sensitive tabs hidden (already done, no change)

This was already implemented in the previous plan via `OrgSettingsPage`'s `visibleTabs` filter. Confirming no further work needed — DELEGATED admins see only Profile / Admin / Subscription with an info banner.

## 3. RLS hardening — Primary-only writes on org configuration

Add two SECURITY DEFINER helpers and replace the broad "any org admin" write policies on four tables.

### Helpers added

```sql
public.is_primary_seeking_admin(p_user_id UUID, p_organization_id UUID) → BOOLEAN
public.is_legacy_org_owner(p_user_id UUID, p_tenant_id UUID) → BOOLEAN
```

Both `STABLE SECURITY DEFINER` with `SET search_path = public`; granted to `authenticated`.

### Policies replaced

For each of:
- `org_legal_document_templates`
- `org_finance_config`
- `org_compliance_config`
- `org_custom_fields`

Drop the existing `"Org admins can manage …"` policy (currently keys on `org_users.role IN ('admin','owner')`) and replace with:

```sql
CREATE POLICY "Primary admin can manage <table>"
  ON public.<table>
  FOR ALL
  USING  ( is_primary_seeking_admin(auth.uid(), organization_id)
        OR is_legacy_org_owner(auth.uid(), tenant_id) )
  WITH CHECK (same condition);
```

Read policies (`"Org members can read …"`) are left untouched — every org member can still SEE the configuration; only the Primary admin (or pre-migration legacy owner) can change it.

### Why both helpers

`is_primary_seeking_admin` is the new tier-based model. `is_legacy_org_owner` is a back-compat fallback for organizations that haven't been migrated to `seeking_org_admins` yet (so today's owners don't get locked out the moment this migration ships).

### Impact

| Caller | Before | After |
|--------|--------|-------|
| PRIMARY SO Admin | ✅ write | ✅ write |
| DELEGATED SO Admin | ✅ write (BUG) | ❌ no write |
| Legacy `org_users.role='owner'` | ✅ write | ✅ write |
| Legacy `org_users.role='admin'` | ✅ write | ❌ no write |
| Other org members | read-only | read-only |

The DELEGATED block closes the privacy hole the previous plan flagged: today a delegated admin who guesses `/org/settings?tab=legal-templates` could overwrite org legal templates. After this migration the UI hides the tab AND the database refuses the write.

### Risk

- Low. No schema changes, no data migration, only policy swap.
- The legacy-owner fallback prevents accidental lockout.
- Reversible — drop new policies, restore old ones.

## Files changed

1. `src/pages/org/ChallengeCreatePage.tsx` — replaced with redirect stub.
2. New migration applied via Supabase migration tool — adds two helpers and swaps four ALL policies.

No other code changes needed.
