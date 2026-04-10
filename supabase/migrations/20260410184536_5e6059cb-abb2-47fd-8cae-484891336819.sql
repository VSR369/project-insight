
DO $$
DECLARE
  v_orphan_ids uuid[] := ARRAY[
    'f15d6710-4f54-41b4-91e6-bb6939576f16',
    '5038ba9d-99ad-4212-8a61-cf36b35b503e',
    'c98f49f7-81b7-4f77-9215-261997c3a1b2',
    '1fc7e397-36a7-4796-a7c0-491cedfebfb1',
    '2e533844-a7ca-4118-8eff-f0e83d7f9489'
  ];
  v_pool_members uuid[] := ARRAY[
    '3b8b2405-9f58-435d-9e28-e96fb2302e8f',
    '77d04806-5e10-42e2-83a2-54176707f09c',
    '8ab563db-d8cf-4eca-bab1-7b282fd1bf58'
  ];
  v_pool_users uuid[] := ARRAY[
    '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13',
    '5c67ff44-51df-4562-9151-0545a5a9faf3',
    '1107c98b-475b-460e-87bf-aeef2743ba4d'
  ];
  v_challenge_id uuid;
  v_idx integer := 0;
  v_result jsonb;
BEGIN
  FOREACH v_challenge_id IN ARRAY v_orphan_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_challenge_roles
      WHERE challenge_id = v_challenge_id AND role_code = 'CU' AND is_active = true
    ) THEN
      v_result := public.assign_challenge_role(
        v_challenge_id,
        v_pool_members[v_idx % 3 + 1],
        v_pool_users[v_idx % 3 + 1],
        'R5_MP',
        'CU',
        v_pool_users[v_idx % 3 + 1],
        'curation'
      );
      RAISE NOTICE 'Challenge % → %', v_challenge_id, v_result;
    END IF;
    v_idx := v_idx + 1;
  END LOOP;
END $$;
