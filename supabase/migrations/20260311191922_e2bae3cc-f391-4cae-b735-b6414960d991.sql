
-- Priority 4: Required Indexes + RLS Policies
-- Fix: use correct column names

-- 1. Indexes on role_assignments
CREATE INDEX IF NOT EXISTS idx_role_assignments_org_status ON public.role_assignments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_code ON public.role_assignments(role_code);
CREATE INDEX IF NOT EXISTS idx_role_assignments_user_status ON public.role_assignments(user_id, status);

-- 2. Indexes on challenge_role_assignments
CREATE INDEX IF NOT EXISTS idx_challenge_role_assignments_challenge ON public.challenge_role_assignments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_role_assignments_pool_member ON public.challenge_role_assignments(pool_member_id);
CREATE INDEX IF NOT EXISTS idx_challenge_role_assignments_status ON public.challenge_role_assignments(status);

-- 3. Indexes on platform_provider_pool
CREATE INDEX IF NOT EXISTS idx_platform_provider_pool_availability ON public.platform_provider_pool(availability_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_provider_pool_role_codes ON public.platform_provider_pool USING GIN(role_codes);

-- 4. Index on role_readiness_cache
CREATE INDEX IF NOT EXISTS idx_role_readiness_cache_org_model ON public.role_readiness_cache(org_id, engagement_model);

-- 5. Index on admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_unread ON public.admin_notifications(admin_id, is_read, created_at DESC);

-- 6. Index on role_audit_log
CREATE INDEX IF NOT EXISTS idx_role_audit_log_entity ON public.role_audit_log(entity_type, entity_id);

-- 7. Index on pending_challenge_refs (correct column: is_resolved)
CREATE INDEX IF NOT EXISTS idx_pending_challenge_refs_org_resolved ON public.pending_challenge_refs(org_id, is_resolved);

-- RLS Policies
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_assignments_select_authenticated" ON public.role_assignments;
CREATE POLICY "role_assignments_select_authenticated" ON public.role_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "role_assignments_insert_authenticated" ON public.role_assignments;
CREATE POLICY "role_assignments_insert_authenticated" ON public.role_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "role_assignments_update_authenticated" ON public.role_assignments;
CREATE POLICY "role_assignments_update_authenticated" ON public.role_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.challenge_role_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenge_role_assignments_select_authenticated" ON public.challenge_role_assignments;
CREATE POLICY "challenge_role_assignments_select_authenticated" ON public.challenge_role_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "challenge_role_assignments_insert_authenticated" ON public.challenge_role_assignments;
CREATE POLICY "challenge_role_assignments_insert_authenticated" ON public.challenge_role_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "challenge_role_assignments_update_authenticated" ON public.challenge_role_assignments;
CREATE POLICY "challenge_role_assignments_update_authenticated" ON public.challenge_role_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.platform_provider_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_provider_pool_select_authenticated" ON public.platform_provider_pool;
CREATE POLICY "platform_provider_pool_select_authenticated" ON public.platform_provider_pool FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "platform_provider_pool_insert_authenticated" ON public.platform_provider_pool;
CREATE POLICY "platform_provider_pool_insert_authenticated" ON public.platform_provider_pool FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "platform_provider_pool_update_authenticated" ON public.platform_provider_pool;
CREATE POLICY "platform_provider_pool_update_authenticated" ON public.platform_provider_pool FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.role_readiness_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_readiness_cache_select_authenticated" ON public.role_readiness_cache;
CREATE POLICY "role_readiness_cache_select_authenticated" ON public.role_readiness_cache FOR SELECT TO authenticated USING (true);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role_audit_log_select_authenticated" ON public.role_audit_log;
CREATE POLICY "role_audit_log_select_authenticated" ON public.role_audit_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "role_audit_log_insert_authenticated" ON public.role_audit_log;
CREATE POLICY "role_audit_log_insert_authenticated" ON public.role_audit_log FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.pending_challenge_refs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pending_challenge_refs_select_authenticated" ON public.pending_challenge_refs;
CREATE POLICY "pending_challenge_refs_select_authenticated" ON public.pending_challenge_refs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pending_challenge_refs_insert_authenticated" ON public.pending_challenge_refs;
CREATE POLICY "pending_challenge_refs_insert_authenticated" ON public.pending_challenge_refs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pending_challenge_refs_update_authenticated" ON public.pending_challenge_refs;
CREATE POLICY "pending_challenge_refs_update_authenticated" ON public.pending_challenge_refs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
