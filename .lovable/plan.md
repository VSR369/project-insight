

# Fix: "Create On Behalf" — Missing Invitation Email + Domain Scope Clarification

## Findings

### 1. Password — Not an issue
These roles use **token-based invitation**, not passwords. When created with `status: "invited"`, the user receives an email with a link (`/org/role-invitation?token=<uuid>`). The `acceptance_token` column auto-generates via `gen_random_uuid()` — so that part works. No password is needed.

### 2. Invitation email is never sent (BUG)
The `CreateOnBehalfSheet` calls `createAssignment.mutateAsync()` but **never invokes the `send-role-invitation` edge function** afterward. Compare with `AssignRoleSheet` (line 203) which does call it. Without this, the invited user has no way to know about or accept the role.

### 3. Domain scope defaults to empty `{}` — means "ALL" (CORRECT by convention)
The `domain_tags` column defaults to `'{}'::jsonb`. In this system, an empty object means no restrictions (i.e., ALL industries, specialities, departments). This is the correct default for a Platform Admin creating on behalf — the Seeking Org Admin can later narrow the scope via the org portal. No change needed here.

### 4. Post-creation editing by SOA — Already supported
The org portal's role management UI (`AssignRoleSheet`, delegated admin pages) allows the Seeking Org Admin to view, edit domain tags, and manage role assignments for their org. So yes, after creation the SOA can adjust scope.

## Plan

### Fix: Send invitation email after creation

**File: `src/components/admin/marketplace/CreateOnBehalfSheet.tsx`**

In `handleSubmit`, after `createAssignment.mutateAsync()` succeeds:
1. Call `supabase.functions.invoke("send-role-invitation", { body: { assignment_id: result.id, org_name: selectedOrgName } })`
2. Capture the returned assignment to get its `id`
3. Look up the org name from the `organizations` prop for the email subject

### Add informational note about domain scope

In the sheet UI, add a small info callout below the form fields explaining:
- "This role will be created with full domain access (all industries, specialities, etc.). The organization's admin can narrow the scope later."

| File | Change |
|---|---|
| `CreateOnBehalfSheet.tsx` | Add `send-role-invitation` call after creation; add domain scope info note |

