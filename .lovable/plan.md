

# Fix: Senior Admin Should Only See Basic Admins

## Analysis — You Are Correct

**Current state (broken):** The RLS SELECT policy on `platform_admin_profiles` is:
```sql
USING (has_role(auth.uid(), 'platform_admin'))
```
This lets ANY platform_admin see ALL profiles — Supervisors, Senior Admins, and Admins alike. A Senior Admin can currently see Supervisor profiles, which violates the hierarchy.

**Desired behavior:**
- **Supervisor** → sees all tiers (Supervisor, Senior Admin, Admin)
- **Senior Admin** → sees only `admin_tier = 'admin'` profiles + their own profile
- **Basic Admin** → sees only their own profile

## Fix Plan

### Step 1: Create a `get_my_admin_tier` security-definer function

A helper function that returns the current user's `admin_tier` without triggering RLS recursion:

```sql
CREATE OR REPLACE FUNCTION public.get_my_admin_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_tier FROM platform_admin_profiles WHERE user_id = p_user_id LIMIT 1;
$$;
```

### Step 2: Replace the SELECT policy

Drop the current permissive `platform_admin_select_profiles` and create tier-aware policies:

```sql
-- Supervisors see all profiles
CREATE POLICY "supervisor_select_all" ON platform_admin_profiles
  FOR SELECT TO authenticated
  USING (is_supervisor_tier(auth.uid()));

-- Senior Admins see only basic admins + themselves
CREATE POLICY "senior_admin_select_basics" ON platform_admin_profiles
  FOR SELECT TO authenticated
  USING (
    get_my_admin_tier(auth.uid()) = 'senior_admin'
    AND (admin_tier = 'admin' OR user_id = auth.uid())
  );

-- Basic Admins see only themselves
CREATE POLICY "admin_select_self" ON platform_admin_profiles
  FOR SELECT TO authenticated
  USING (
    get_my_admin_tier(auth.uid()) = 'admin'
    AND user_id = auth.uid()
  );
```

These are all `PERMISSIVE` (default), so PostgreSQL OR's them together — a Supervisor matches policy 1, a Senior Admin matches policy 2, a Basic Admin matches policy 3. No overlap issues.

### Step 3: No frontend changes needed

The list page (`PlatformAdminListPage`) already fetches all visible profiles and renders them. The database will now return only the correct subset per tier. The tier filter dropdown, pagination, and UI all work as-is.

## Files Changed

| Item | Change |
|------|--------|
| **DB Migration** | Create `get_my_admin_tier` function, drop old SELECT policy, create 3 tier-aware SELECT policies |
| **No frontend changes** | RLS handles filtering at database level |

