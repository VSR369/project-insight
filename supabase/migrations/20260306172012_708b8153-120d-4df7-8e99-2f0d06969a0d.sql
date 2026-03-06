
-- Drop and recreate get_eligible_admins_ranked with expanded return type (GAPs 2,3,12)
DROP FUNCTION IF EXISTS public.get_eligible_admins_ranked(UUID[], UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_eligible_admins_ranked(
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type UUID DEFAULT NULL,
  p_exclude_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  admin_id UUID,
  full_name TEXT,
  email TEXT,
  admin_tier TEXT,
  availability_status TEXT,
  current_active INTEGER,
  max_concurrent INTEGER,
  is_supervisor BOOLEAN,
  total_score INTEGER,
  industry_score INTEGER,
  country_score INTEGER,
  org_type_score INTEGER,
  workload_ratio DOUBLE PRECISION,
  assignment_priority INTEGER,
  last_assignment_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_w_l1 INTEGER;
  v_w_l2 INTEGER;
  v_w_l3 INTEGER;
BEGIN
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l1_weight'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l2_weight'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l3_weight'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  RETURN QUERY
  SELECT
    pap.id,
    pap.full_name,
    pap.email,
    pap.admin_tier,
    pap.availability_status,
    pap.current_active_verifications AS current_active,
    pap.max_concurrent_verifications AS max_concurrent,
    pap.is_supervisor,
    (
      COALESCE(
        (SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
         FROM unnest(pap.industry_expertise) ie
         WHERE ie = ANY(p_industry_segments)),
        0
      )
      + CASE
          WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL
            THEN (v_w_l2 / 2)
          WHEN p_hq_country = ANY(pap.country_region_expertise)
            THEN v_w_l2
          ELSE 0
        END
      + CASE
          WHEN p_org_type IS NULL THEN 0
          WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL
            THEN (v_w_l3 / 2)
          WHEN p_org_type = ANY(pap.org_type_expertise)
            THEN v_w_l3
          ELSE 0
        END
    )::INTEGER AS total_score,
    COALESCE(
      (SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
       FROM unnest(pap.industry_expertise) ie
       WHERE ie = ANY(p_industry_segments)),
      0
    ) AS industry_score,
    CASE
      WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL
        THEN (v_w_l2 / 2)
      WHEN p_hq_country = ANY(pap.country_region_expertise)
        THEN v_w_l2
      ELSE 0
    END AS country_score,
    CASE
      WHEN p_org_type IS NULL THEN 0
      WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL
        THEN (v_w_l3 / 2)
      WHEN p_org_type = ANY(pap.org_type_expertise)
        THEN v_w_l3
      ELSE 0
    END AS org_type_score,
    CASE WHEN pap.max_concurrent_verifications > 0
      THEN (pap.current_active_verifications::FLOAT / pap.max_concurrent_verifications::FLOAT)
      ELSE 1.0
    END AS workload_ratio,
    pap.assignment_priority,
    pap.last_assignment_timestamp
  FROM platform_admin_profiles pap
  WHERE pap.availability_status IN ('available', 'partially_available')
    AND (p_exclude_admin_id IS NULL OR pap.id != p_exclude_admin_id)
  ORDER BY total_score DESC, workload_ratio ASC, pap.assignment_priority ASC, pap.last_assignment_timestamp ASC NULLS FIRST;
END;
$function$;
