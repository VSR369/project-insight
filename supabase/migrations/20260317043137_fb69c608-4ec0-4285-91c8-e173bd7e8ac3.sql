
-- Re-insert test fixtures (will be cleaned up at end)
DO $$
DECLARE
  v_user_id uuid := '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13';
  v_challenge_mp uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb01';
  v_challenge_agg uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb02';
  v_tenant_id uuid := '9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb';
BEGIN
  INSERT INTO challenges (id, tenant_id, organization_id, title, status, current_phase, phase_status, master_status, operating_model)
  VALUES 
    (v_challenge_mp, v_tenant_id, v_tenant_id, 'Test MP Challenge', 'active', 2, 'ACTIVE', 'ACTIVE', 'MP'),
    (v_challenge_agg, v_tenant_id, v_tenant_id, 'Test AGG Challenge', 'active', 2, 'ACTIVE', 'ACTIVE', 'AGG')
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM user_challenge_roles WHERE user_id = v_user_id AND challenge_id IN (v_challenge_mp, v_challenge_agg);
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned) VALUES
    (v_user_id, v_challenge_mp, 'CR', true, false),
    (v_user_id, v_challenge_mp, 'CU', true, false),
    (v_user_id, v_challenge_mp, 'RQ', true, false),
    (v_user_id, v_challenge_agg, 'AM', true, false);
END;
$$;
