
-- Drop any existing tier-aware policies from previous attempts
DROP POLICY IF EXISTS "supervisor_select_all" ON public.platform_admin_profiles;
DROP POLICY IF EXISTS "senior_admin_select_basics" ON public.platform_admin_profiles;
DROP POLICY IF EXISTS "admin_select_self" ON public.platform_admin_profiles;

-- Recreate tier-aware SELECT policies

-- Supervisors see all profiles
CREATE POLICY "supervisor_select_all" ON public.platform_admin_profiles
  FOR SELECT TO authenticated
  USING (public.is_supervisor_tier(auth.uid()));

-- Senior Admins see only basic admins + themselves
CREATE POLICY "senior_admin_select_basics" ON public.platform_admin_profiles
  FOR SELECT TO authenticated
  USING (
    public.get_my_admin_tier(auth.uid()) = 'senior_admin'
    AND (admin_tier = 'admin' OR user_id = auth.uid())
  );

-- Basic Admins see only themselves
CREATE POLICY "admin_select_self" ON public.platform_admin_profiles
  FOR SELECT TO authenticated
  USING (
    public.get_my_admin_tier(auth.uid()) = 'admin'
    AND user_id = auth.uid()
  );
