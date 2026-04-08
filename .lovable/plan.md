

# Fix: Seed Org Legal Templates for AGG Model (3 Changes)

## Problem
The `complete_phase` SQL function branches on operating model: AGG pulls legal docs from `org_legal_document_templates`, MP pulls from `legal_document_templates`. Currently `org_legal_document_templates` is empty, so AGG challenges C1 (CONTROLLED) and C3 (STRUCTURED) get zero legal docs attached. C5 (QUICK) is unaffected -- QUICK always uses platform templates.

## Changes — Single file: `supabase/functions/setup-test-scenario/index.ts`

### Change 1: Add cleanup for org_legal_document_templates (line 109)
Insert after the `org_users` delete, before the `seeker_organizations` delete:
```typescript
await sa.from("org_legal_document_templates").delete().in("organization_id", oldOrgIds);
```

### Change 2: Seed org-level legal templates (after line 130, before user creation)
After `results.push("Org: ...")`, insert a block that:
1. Fetches all 5 active platform templates from `legal_document_templates`
2. Maps each to an `org_legal_document_templates` row with the new `orgId`, correct `applies_to_mode` (PMA/CA/PSA=ALL, IPAA=STRUCTURED, EPIA=CONTROLLED), and `version_status=ACTIVE`
3. Bulk inserts into `org_legal_document_templates`
4. Logs success/failure count

### Change 3: Add organization_id filter to orgLT query (line 326)
```typescript
// FROM:
.select("id, document_code, document_name, tier").eq("is_active", true)
// TO:
.select("id, document_code, document_name, tier").eq("organization_id", orgId).eq("is_active", true)
```

### Deploy
Redeploy `setup-test-scenario` edge function after changes.

### Result
- Re-runs clean org templates via cleanup
- AGG challenges C1 and C3 get legal docs attached
- `complete_phase` finds data when branching on AGG model
- LC workspace shows documents for AGG challenges

