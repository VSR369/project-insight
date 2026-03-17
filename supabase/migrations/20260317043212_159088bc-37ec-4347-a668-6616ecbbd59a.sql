
-- T02-06 verification + cleanup
DO $$
DECLARE
  v_user_id uuid := '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13';
  v_challenge_mp uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb01';
  v_challenge_agg uuid := 'bbbbbbbb-0000-0000-0000-bbbbbbbbbb02';
  v_result boolean;
BEGIN
  -- T02-06: phase_status = COMPLETED
  UPDATE challenges SET phase_status = 'COMPLETED' WHERE id = v_challenge_mp;
  SELECT public.can_perform(v_user_id, v_challenge_mp, 'CR', 2) INTO v_result;
  IF v_result = false THEN
    RAISE NOTICE 'T02-06: PASS (false as expected)';
  ELSE
    RAISE NOTICE 'T02-06: FAIL (got true)';
  END IF;

  -- Cleanup
  DELETE FROM user_challenge_roles WHERE user_id = v_user_id AND challenge_id IN (v_challenge_mp, v_challenge_agg);
  DELETE FROM challenges WHERE id IN (v_challenge_mp, v_challenge_agg);
END;
$$;
