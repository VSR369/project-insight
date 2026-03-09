

# Plan: Fix RLS Policies for Delegated Admin Creation by Primary SO Admin

## Root Cause

The `seeking_org_admins` and `admin_activation_links` tables only have INSERT/UPDATE policies for users with the `platform_admin` role. The Primary SO Admin has the `seeker` role, so RLS blocks all writes — causing the "Permission denied: your account does not have the required access level" error.

## Current Policies

| Table | Policy | Allows |
|-------|--------|--------|
| `seeking_org_admins` | "Platform admins can manage" | ALL for `platform_admin` only |
| `seeking_org_admins` | "Org admins can view" | SELECT where `user_id = auth.uid()` |
| `admin_activation_links` | "Platform admins can manage" | ALL for `platform_admin` only |

## Required New Policies

### 1. `seeking_org_admins` — Allow PRIMARY admin to manage delegated admins in their org

```sql
-- Primary SO Admin can INSERT delegated admins into their own org
CREATE POLICY "Primary admin can create delegated admins"
ON public.seeking_org_admins
FOR INSERT
TO authenticated
WITH CHECK (
  admin_tier = 'DELEGATED'
  AND EXISTS (
    SELECT 1 FROM public.seeking_org_admins sa
    WHERE sa.organization_id = organization_id
      AND sa.user_id = auth.uid()
      AND sa.admin_tier = 'PRIMARY'
      AND sa.status = 'active'
  )
);

-- Primary SO Admin can UPDATE delegated admins in their own org
CREATE POLICY "Primary admin can update delegated admins"
ON public.seeking_org_admins
FOR UPDATE
TO authenticated
USING (
  admin_tier = 'DELEGATED'
  AND EXISTS (
    SELECT 1 FROM public.seeking_org_admins sa
    WHERE sa.organization_id = organization_id
      AND sa.user_id = auth.uid()
      AND sa.admin_tier = 'PRIMARY'
      AND sa.status = 'active'
  )
);

-- Primary SO Admin can SELECT all admins in their org (not just their own record)
CREATE POLICY "Primary admin can view org admins"
ON public.seeking_org_admins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seeking_org_admins sa
    WHERE sa.organization_id = organization_id
      AND sa.user_id = auth.uid()
      AND sa.admin_tier = 'PRIMARY'
      AND sa.status = 'active'
  )
);
```

### 2. `admin_activation_links` — Allow PRIMARY admin to create activation links for their org's admins

```sql
CREATE POLICY "Primary admin can create activation links"
ON public.admin_activation_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seeking_org_admins sa
    WHERE sa.id = admin_activation_links.admin_id
      AND EXISTS (
        SELECT 1 FROM public.seeking_org_admins me
        WHERE me.organization_id = sa.organization_id
          AND me.user_id = auth.uid()
          AND me.admin_tier = 'PRIMARY'
          AND me.status = 'active'
      )
  )
);
```

### Security Notes
- INSERT on `seeking_org_admins` is restricted to `admin_tier = 'DELEGATED'` only — a Primary admin cannot create another PRIMARY admin
- All policies scope to the same `organization_id` — no cross-org access
- The existing `platform_admin` policy remains untouched
- Uses a SECURITY DEFINER helper function to avoid RLS recursion on the self-referencing check

### Implementation
To avoid recursion (policy on `seeking_org_admins` querying `seeking_org_admins`), create a `SECURITY DEFINER` helper:

```sql
CREATE OR REPLACE FUNCTION public.is_primary_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seeking_org_admins
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND admin_tier = 'PRIMARY'
      AND status = 'active'
  );
$$;
```

Then policies use `is_primary_org_admin(organization_id)` instead of inline subqueries.

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | Create `is_primary_org_admin()` function + 4 new RLS policies |

## What This Does NOT Change
- Platform admin access remains unchanged
- Existing SELECT policy for `user_id = auth.uid()` remains (delegated admins can still see their own record)
- No frontend code changes needed

