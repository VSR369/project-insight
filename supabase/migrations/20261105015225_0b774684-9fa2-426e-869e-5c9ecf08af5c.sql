CREATE OR REPLACE FUNCTION public.list_certified_providers_for_challenge(p_challenge_id uuid)
RETURNS TABLE(
  provider_id uuid,
  provider_name text,
  industry_segment_name text,
  expertise_level integer,
  star_rating numeric,
  invitation_id uuid,
  invitation_status text,
  invited_at timestamptz,
  valid_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.challenges%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_not_found';
  END IF;

  IF NOT (has_role(auth.uid(), 'platform_admin'::app_role)
          OR has_active_challenge_role(c.id, auth.uid())
          OR c.tenant_id = get_user_tenant_id()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    sp.id AS provider_id,
    trim(concat(sp.first_name, ' ', sp.last_name))::text AS provider_name,
    seg.name::text AS industry_segment_name,
    COALESCE(el.level_number, 1) AS expertise_level,
    e.star_rating,
    ci.id AS invitation_id,
    ci.status::text AS invitation_status,
    ci.invited_at,
    ci.valid_until
  FROM public.provider_industry_enrollments e
  JOIN public.solution_providers sp ON sp.id = e.provider_id
  LEFT JOIN public.industry_segments seg ON seg.id = e.industry_segment_id
  LEFT JOIN public.expertise_levels el ON el.id = e.expertise_level_id
  LEFT JOIN public.challenge_invitations ci
    ON ci.challenge_id = p_challenge_id AND ci.provider_id = sp.id
  WHERE e.lifecycle_status = 'certified'
    AND (c.industry_segment_id IS NULL OR e.industry_segment_id = c.industry_segment_id)
    AND COALESCE(el.level_number, 1) >= COALESCE(c.min_expertise_level, 1)
  ORDER BY COALESCE(el.level_number, 1) DESC, e.star_rating DESC NULLS LAST, provider_name ASC;
END $function$;

REVOKE EXECUTE ON FUNCTION public.list_certified_providers_for_challenge(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_certified_providers_for_challenge(uuid) TO authenticated;