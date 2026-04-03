-- ╔══════════════════════════════════════════════════════════════╗
-- ║  NUCLEAR CLEANUP — Delete ALL challenges + dependent data    ║
-- ║  28 child tables cleaned in FK-safe order                    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Tables WITHOUT ON DELETE CASCADE (must delete explicitly, children first)
DELETE FROM public.audit_trail WHERE challenge_id IS NOT NULL;
DELETE FROM public.sla_timers;
DELETE FROM public.cogni_notifications WHERE challenge_id IS NOT NULL;
DELETE FROM public.challenge_legal_docs;
DELETE FROM public.challenge_package_versions;
DELETE FROM public.challenge_qa;
DELETE FROM public.user_challenge_roles;
DELETE FROM public.challenge_role_assignments;
DELETE FROM public.legal_acceptance_log WHERE challenge_id IS NOT NULL;
DELETE FROM public.legal_review_requests;
DELETE FROM public.legal_reacceptance_records;

-- Tables that MAY have challenge_id without CASCADE
DELETE FROM public.challenge_incentive_selections;
DELETE FROM public.challenge_prize_tiers;
DELETE FROM public.challenge_section_approvals;
DELETE FROM public.challenge_submissions;
DELETE FROM public.challenge_context_digest;
DELETE FROM public.communication_log WHERE challenge_id IS NOT NULL;
DELETE FROM public.curation_progress;
DELETE FROM public.curation_quality_metrics;
DELETE FROM public.curator_section_actions;
DELETE FROM public.dispute_records;
DELETE FROM public.duplicate_reviews;
DELETE FROM public.escrow_records;
DELETE FROM public.ip_transfer_records;
DELETE FROM public.pending_challenge_refs;
DELETE FROM public.rating_records;
DELETE FROM public.section_example_library;
DELETE FROM public.solutions;
DELETE FROM public.solver_challenge_feedback;
DELETE FROM public.solver_enrollments;

-- Now delete the challenges themselves
DELETE FROM public.challenges;

-- Reset pool assignment counters
UPDATE public.platform_provider_pool SET current_assignments = 0;