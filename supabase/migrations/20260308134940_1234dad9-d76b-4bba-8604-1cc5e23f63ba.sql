
-- API-07-03: validate_domain_weights — read-only pre-check RPC
-- Returns validation result without committing changes.
CREATE OR REPLACE FUNCTION public.validate_domain_weights(
  p_l1 INTEGER,
  p_l2 INTEGER,
  p_l3 INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum INTEGER;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  v_sum := p_l1 + p_l2 + p_l3;

  -- Validate sum = 100
  IF v_sum <> 100 THEN
    v_errors := v_errors || jsonb_build_array(
      jsonb_build_object('code', 'SUM_NOT_100', 'message', format('Weights sum to %s, must equal 100', v_sum))
    );
  END IF;

  -- Validate individual ranges (0-100)
  IF p_l1 < 0 OR p_l1 > 100 THEN
    v_errors := v_errors || jsonb_build_array(
      jsonb_build_object('code', 'L1_OUT_OF_RANGE', 'message', 'L1 (Industry) must be 0-100')
    );
  END IF;
  IF p_l2 < 0 OR p_l2 > 100 THEN
    v_errors := v_errors || jsonb_build_array(
      jsonb_build_object('code', 'L2_OUT_OF_RANGE', 'message', 'L2 (Country) must be 0-100')
    );
  END IF;
  IF p_l3 < 0 OR p_l3 > 100 THEN
    v_errors := v_errors || jsonb_build_array(
      jsonb_build_object('code', 'L3_OUT_OF_RANGE', 'message', 'L3 (Org Type) must be 0-100')
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'sum', v_sum,
    'errors', v_errors
  );
END;
$$;
