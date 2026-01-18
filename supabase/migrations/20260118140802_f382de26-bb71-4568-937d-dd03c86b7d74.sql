-- =====================================================
-- Fix RLS Policy for panel_reviewers table
-- Allow platform admins to see ALL reviewers (including is_active=false)
-- This is required for the approval workflow
-- =====================================================

-- Drop existing policies that may conflict
DROP POLICY IF EXISTS "Reviewers visible to authenticated users" ON panel_reviewers;
DROP POLICY IF EXISTS "Admins can manage reviewers" ON panel_reviewers;
DROP POLICY IF EXISTS "Active reviewers visible to authenticated" ON panel_reviewers;
DROP POLICY IF EXISTS "Admin full access to reviewers" ON panel_reviewers;
DROP POLICY IF EXISTS "Reviewers can view own record" ON panel_reviewers;

-- 1. Active reviewers visible to all authenticated users
CREATE POLICY "Active reviewers visible to authenticated" 
ON panel_reviewers 
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Platform admins have full access to ALL reviewer records (including inactive/pending)
CREATE POLICY "Admin full access to reviewers" 
ON panel_reviewers 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'platform_admin'
  )
);

-- 3. Reviewers can view their own record (regardless of is_active status)
CREATE POLICY "Reviewers can view own record" 
ON panel_reviewers 
FOR SELECT
TO authenticated
USING (user_id = auth.uid());