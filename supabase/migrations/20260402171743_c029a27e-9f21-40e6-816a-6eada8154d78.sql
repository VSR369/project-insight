
-- Step A: Fix CHECK constraints
ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT IF EXISTS challenge_role_assignments_role_code_check;
ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_role_code_check
  CHECK (role_code IN ('R3','R4','R10_CR','R5_MP','R5_AGG','R7_MP','R7_AGG','R8','R9'));

ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT IF EXISTS challenge_role_assignments_assignment_phase_check;
ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_assignment_phase_check
  CHECK (assignment_phase IN (
    'abstract_screening','full_evaluation',
    'curation','legal_review','finance_review'
  ));

-- Step B: Create auto_assign_challenge_role SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.auto_assign_challenge_role(
  p_challenge_id UUID,
  p_pool_member_id UUID,
  p_user_id UUID,
  p_slm_role_code TEXT,
  p_governance_role_code TEXT,
  p_assigned_by UUID,
  p_assignment_phase TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  INSERT INTO challenge_role_assignments (
    challenge_id, pool_member_id, role_code, assigned_by,
    assigned_at, status, assignment_phase, created_by
  ) VALUES (
    p_challenge_id, p_pool_member_id, p_slm_role_code, p_assigned_by,
    NOW(), 'active', p_assignment_phase, p_assigned_by
  )
  RETURNING id INTO v_assignment_id;

  INSERT INTO user_challenge_roles (
    user_id, challenge_id, role_code, assigned_by,
    assigned_at, is_active, auto_assigned, created_by
  ) VALUES (
    p_user_id, p_challenge_id, p_governance_role_code, p_assigned_by,
    NOW(), TRUE, TRUE, p_assigned_by
  )
  ON CONFLICT (user_id, challenge_id, role_code)
  DO UPDATE SET
    is_active = TRUE, auto_assigned = TRUE,
    assigned_by = p_assigned_by, updated_at = NOW(), updated_by = p_assigned_by;

  UPDATE platform_provider_pool
  SET current_assignments = current_assignments + 1, updated_at = NOW()
  WHERE id = p_pool_member_id;

  INSERT INTO audit_trail (
    user_id, challenge_id, action, method, details, created_by
  ) VALUES (
    p_assigned_by, p_challenge_id, 'ROLE_AUTO_ASSIGNED', 'SYSTEM',
    jsonb_build_object(
      'slm_role_code', p_slm_role_code,
      'governance_role_code', p_governance_role_code,
      'pool_member_id', p_pool_member_id,
      'assigned_to_user', p_user_id,
      'assignment_id', v_assignment_id,
      'assignment_phase', p_assignment_phase
    ),
    p_assigned_by
  );

  RETURN jsonb_build_object('success', TRUE, 'assignment_id', v_assignment_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_assign_challenge_role TO authenticated;

-- Step C: Deactivate removed legacy roles
UPDATE platform_roles
SET is_active = FALSE, updated_at = NOW()
WHERE role_code IN ('AM','RQ','ID','CA') AND is_active = TRUE;

-- Step D: Insert demo curator pool entry + backfill user_ids
INSERT INTO platform_provider_pool (
  user_id, full_name, email, role_codes, domain_scope,
  max_concurrent, current_assignments, availability_status, is_active
) VALUES (
  '5c67ff44-51df-4562-9151-0545a5a9faf3',
  'Casey Underwood',
  'nh-cu@testsetup.dev',
  ARRAY['R5_MP'],
  '{"industry_segment_ids":[],"proficiency_area_ids":[],"sub_domain_ids":[],"speciality_ids":[],"department_ids":[],"functional_area_ids":[]}'::jsonb,
  5, 0, 'available', TRUE
)
ON CONFLICT DO NOTHING;

UPDATE platform_provider_pool p
SET user_id = u.id, updated_at = NOW()
FROM auth.users u
WHERE p.email = u.email AND p.user_id IS NULL;
