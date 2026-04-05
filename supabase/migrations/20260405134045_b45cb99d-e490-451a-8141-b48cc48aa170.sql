
-- Clean up all challenge data for fresh start
DELETE FROM challenge_prize_tiers;
DELETE FROM user_challenge_roles;
DELETE FROM challenge_section_approvals;
DELETE FROM challenge_legal_docs;
DELETE FROM escrow_records;
DELETE FROM challenge_qa;
DELETE FROM challenge_attachments;
DELETE FROM challenge_incentive_selections;
DELETE FROM challenge_context_digest;
DELETE FROM challenge_package_versions;
DELETE FROM challenge_role_assignments;
DELETE FROM pending_challenge_refs;
DELETE FROM curation_progress;
DELETE FROM curation_quality_metrics;
DELETE FROM cogni_notifications;
DELETE FROM communication_log;
DELETE FROM amendment_records;
DELETE FROM challenge_submissions;
DELETE FROM audit_trail;
DELETE FROM challenges;
