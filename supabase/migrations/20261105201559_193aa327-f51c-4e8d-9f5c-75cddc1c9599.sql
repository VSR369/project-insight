-- Per-currency allowed ranges for legal review thresholds (agreed 5 Nov 2026)
UPDATE public.md_legal_review_thresholds SET min_amount = 1000, max_amount = 10000000
 WHERE currency_code IN ('USD','EUR','GBP');
UPDATE public.md_legal_review_thresholds SET min_amount = 50000, max_amount = 1000000000
 WHERE currency_code = 'INR';

-- One-off: copy today's settings onto open records that have no snapshot.
-- Snapshot triggers freeze config_snapshot on update, so bypass them for this backfill only.
ALTER TABLE public.provider_industry_enrollments DISABLE TRIGGER USER;
UPDATE public.provider_industry_enrollments SET config_snapshot = public.fn_config_snapshot_payload() || '{"backfilled":true}'::jsonb
 WHERE config_snapshot IS NULL
   AND lifecycle_status::text NOT IN ('certified','not_certified','not_verified','inactive','interview_unsuccessful');
ALTER TABLE public.provider_industry_enrollments ENABLE TRIGGER USER;

ALTER TABLE public.assessment_attempts DISABLE TRIGGER USER;
UPDATE public.assessment_attempts SET config_snapshot = public.fn_config_snapshot_payload() || '{"backfilled":true}'::jsonb
 WHERE config_snapshot IS NULL AND submitted_at IS NULL;
ALTER TABLE public.assessment_attempts ENABLE TRIGGER USER;

ALTER TABLE public.interview_bookings DISABLE TRIGGER USER;
UPDATE public.interview_bookings SET config_snapshot = public.fn_config_snapshot_payload() || '{"backfilled":true}'::jsonb
 WHERE config_snapshot IS NULL AND status NOT IN ('cancelled','completed');
ALTER TABLE public.interview_bookings ENABLE TRIGGER USER;

ALTER TABLE public.challenge_award_decisions DISABLE TRIGGER USER;
UPDATE public.challenge_award_decisions SET config_snapshot = public.fn_config_snapshot_payload() || '{"backfilled":true}'::jsonb
 WHERE config_snapshot IS NULL AND decision_status NOT IN ('FINAL','CANCELLED','VOID');
ALTER TABLE public.challenge_award_decisions ENABLE TRIGGER USER;