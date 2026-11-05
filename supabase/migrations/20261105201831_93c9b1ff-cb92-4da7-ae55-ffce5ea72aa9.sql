-- W2 start: the 7 views now run with the caller's own access rules (security_invoker)
CREATE OR REPLACE FUNCTION public.fn_booked_backing_slot_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT br.slot_id FROM booking_reviewers br
  JOIN interview_bookings ib ON ib.id = br.booking_id
  WHERE br.status::text = 'assigned' AND ib.status::text IN ('scheduled','confirmed');
$$;
REVOKE ALL ON FUNCTION public.fn_booked_backing_slot_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_booked_backing_slot_ids() TO authenticated;

CREATE OR REPLACE VIEW public.available_composite_slots WITH (security_invoker = true) AS
WITH booked_slots AS (SELECT s AS slot_id FROM public.fn_booked_backing_slot_ids() s),
slot_availability AS (
  SELECT cs_1.id, cs_1.available_reviewer_count AS total_reviewers,
         (cs_1.available_reviewer_count - count(bs.slot_id)) AS available_reviewers
  FROM composite_interview_slots cs_1
  LEFT JOIN LATERAL unnest(cs_1.backing_slot_ids) backing_id(backing_id) ON true
  LEFT JOIN booked_slots bs ON bs.slot_id = backing_id.backing_id
  GROUP BY cs_1.id, cs_1.available_reviewer_count)
SELECT cs.id, cs.expertise_level_id, cs.industry_segment_id, cs.start_at, cs.end_at,
  GREATEST(sa.available_reviewers, 0::bigint) AS available_reviewer_count, cs.backing_slot_ids,
  CASE WHEN sa.available_reviewers <= 0 THEN 'full'::character varying ELSE cs.status END AS status,
  cs.created_at, cs.updated_at
FROM composite_interview_slots cs JOIN slot_availability sa ON sa.id = cs.id
WHERE cs.start_at > now();

-- Stop the raw organisation name leaking through the match view (DEF-0034)
CREATE OR REPLACE VIEW public.v_challenge_match WITH (security_invoker = true) AS
SELECT c.id AS challenge_id, c.title, c.industry_segment_id, ise.name AS industry_name,
  c.complexity_level, c.solver_audience, c.min_star_tier, c.status AS challenge_status,
  c.submission_deadline, c.reward_amount, c.currency_code, c.domain_tags,
  c.solver_eligibility_id, c.organization_id, c.org_display_name::varchar(200) AS organization_name
FROM challenges c LEFT JOIN industry_segments ise ON ise.id = c.industry_segment_id
WHERE c.is_deleted = false AND c.is_active = true;

ALTER VIEW public.recent_activity_view SET (security_invoker = true);
ALTER VIEW public.vw_provider_resolved_cert SET (security_invoker = true);
ALTER VIEW public.v_provider_dashboard SET (security_invoker = true);
ALTER VIEW public.v_cert_leaderboard SET (security_invoker = true);
ALTER VIEW public.v_org_active_enterprise_agreement SET (security_invoker = true);

REVOKE ALL ON public.available_composite_slots, public.v_challenge_match, public.recent_activity_view,
  public.vw_provider_resolved_cert, public.v_provider_dashboard, public.v_cert_leaderboard,
  public.v_org_active_enterprise_agreement FROM anon;
GRANT SELECT ON public.available_composite_slots, public.v_challenge_match, public.recent_activity_view,
  public.vw_provider_resolved_cert, public.v_provider_dashboard, public.v_cert_leaderboard,
  public.v_org_active_enterprise_agreement TO authenticated, service_role;