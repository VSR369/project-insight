
-- ═══════════════════════════════════════════════════════════
-- P3: check_delegated_scope() DB function (BR-SOA-003)
-- Server-side enforcement of delegated admin domain scope
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_delegated_scope(
  p_admin_id UUID,
  p_entity_scope JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_scope JSONB;
  v_admin_tier TEXT;
  v_field TEXT;
  v_admin_ids JSONB;
  v_entity_ids JSONB;
  v_entity_id TEXT;
BEGIN
  -- Get admin tier and scope
  SELECT admin_tier, domain_scope::jsonb
    INTO v_admin_tier, v_admin_scope
    FROM seeking_org_admins
   WHERE id = p_admin_id
     AND status = 'active';

  -- PRIMARY admins have unrestricted scope
  IF v_admin_tier = 'PRIMARY' OR v_admin_tier IS NULL THEN
    RETURN TRUE;
  END IF;

  -- DELEGATED admins: check each scope dimension
  -- Empty array in admin scope = ALL (unrestricted for that dimension)
  FOREACH v_field IN ARRAY ARRAY['industry_segment_ids','proficiency_area_ids','sub_domain_ids','speciality_ids','department_ids','functional_area_ids']
  LOOP
    v_admin_ids := COALESCE(v_admin_scope->v_field, '[]'::jsonb);
    v_entity_ids := COALESCE(p_entity_scope->v_field, '[]'::jsonb);

    -- If admin has empty array (ALL), skip this dimension
    IF jsonb_array_length(v_admin_ids) = 0 THEN
      CONTINUE;
    END IF;

    -- If entity has values, ALL must be within admin's scope
    IF jsonb_array_length(v_entity_ids) > 0 THEN
      FOR v_entity_id IN SELECT jsonb_array_elements_text(v_entity_ids)
      LOOP
        IF NOT v_admin_ids ? v_entity_id THEN
          RETURN FALSE;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- P3: pending_challenge_refs table (BR-MP-CONTACT-003)
-- Blocks challenge progression when core roles are missing
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pending_challenge_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  engagement_model TEXT NOT NULL DEFAULT 'mp',
  blocking_reason TEXT NOT NULL DEFAULT 'missing_core_roles',
  missing_role_codes TEXT[] NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT chk_pcr_blocking_reason CHECK (blocking_reason IN ('missing_core_roles', 'missing_challenge_roles', 'readiness_not_met'))
);

CREATE INDEX IF NOT EXISTS idx_pcr_challenge ON pending_challenge_refs(challenge_id) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_pcr_org ON pending_challenge_refs(org_id, is_resolved);

ALTER TABLE public.pending_challenge_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pending_challenge_refs" ON public.pending_challenge_refs
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert pending_challenge_refs" ON public.pending_challenge_refs
  FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update pending_challenge_refs" ON public.pending_challenge_refs
  FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════
-- P3: DB trigger for before/after audit logging on role_assignments
-- Writes to role_audit_log on INSERT/UPDATE/DELETE
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_audit_role_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_audit_log (entity_type, entity_id, action, actor_id, org_id, before_state, after_state, metadata)
    VALUES ('role_assignment', NEW.id, 'created', NEW.created_by, NEW.org_id, NULL,
      jsonb_build_object('role_code', NEW.role_code, 'user_email', NEW.user_email, 'status', NEW.status, 'model_applicability', NEW.model_applicability),
      jsonb_build_object('trigger', 'fn_audit_role_assignments'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO role_audit_log (entity_type, entity_id, action, actor_id, org_id, before_state, after_state, metadata)
    VALUES ('role_assignment', NEW.id, 'updated', NEW.updated_by, NEW.org_id,
      jsonb_build_object('role_code', OLD.role_code, 'user_email', OLD.user_email, 'status', OLD.status),
      jsonb_build_object('role_code', NEW.role_code, 'user_email', NEW.user_email, 'status', NEW.status),
      jsonb_build_object('trigger', 'fn_audit_role_assignments', 'status_changed', OLD.status IS DISTINCT FROM NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO role_audit_log (entity_type, entity_id, action, actor_id, org_id, before_state, after_state, metadata)
    VALUES ('role_assignment', OLD.id, 'deleted', OLD.updated_by, OLD.org_id,
      jsonb_build_object('role_code', OLD.role_code, 'user_email', OLD.user_email, 'status', OLD.status),
      NULL,
      jsonb_build_object('trigger', 'fn_audit_role_assignments'));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_assignments_audit ON role_assignments;
CREATE TRIGGER trg_role_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_role_assignments();

-- Also audit pool member changes
CREATE OR REPLACE FUNCTION public.fn_audit_pool_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_audit_log (entity_type, entity_id, action, actor_id, before_state, after_state, metadata)
    VALUES ('pool_member', NEW.id, 'created', NEW.created_by, NULL,
      jsonb_build_object('full_name', NEW.full_name, 'email', NEW.email, 'role_codes', to_jsonb(NEW.role_codes), 'is_active', NEW.is_active),
      jsonb_build_object('trigger', 'fn_audit_pool_members'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO role_audit_log (entity_type, entity_id, action, actor_id, before_state, after_state, metadata)
    VALUES ('pool_member', NEW.id, 'updated', NEW.updated_by,
      jsonb_build_object('full_name', OLD.full_name, 'role_codes', to_jsonb(OLD.role_codes), 'is_active', OLD.is_active, 'availability_status', OLD.availability_status),
      jsonb_build_object('full_name', NEW.full_name, 'role_codes', to_jsonb(NEW.role_codes), 'is_active', NEW.is_active, 'availability_status', NEW.availability_status),
      jsonb_build_object('trigger', 'fn_audit_pool_members', 'deactivated', OLD.is_active AND NOT NEW.is_active));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pool_members_audit ON platform_provider_pool;
CREATE TRIGGER trg_pool_members_audit
  AFTER INSERT OR UPDATE ON platform_provider_pool
  FOR EACH ROW EXECUTE FUNCTION fn_audit_pool_members();
