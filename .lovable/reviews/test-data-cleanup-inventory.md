# Proposed clean-test-data reset

**Status: approval requested. No database rows, files, access rules, schemas, or application screens have been changed.**

## Retained administrator

The administrator identified by you will retain their `auth.users` row and only the identity, session, MFA, profile, platform-role and current global legal-acceptance records needed to remain signed in. Organisation-linked memberships and old history are not retained. All other users are removed.

## Public tables — clear every row (161)

admin_access_codes, admin_activation_links, admin_notifications, admin_performance_metrics, admin_transfer_requests, amendment_records, assessment_attempt_responses, assessment_attempts, assessment_results_rollup, audit_trail, background_jobs, booking_reviewers, challenge_ambiguity_findings, challenge_attachments, challenge_award_decisions, challenge_award_lines, challenge_confidential_sections, challenge_consistency_findings, challenge_context_digest, challenge_edit_history, challenge_incentive_selections, challenge_invitations, challenge_legal_docs, challenge_package_versions, challenge_prize_tiers, challenge_qa, challenge_quality_telemetry, challenge_role_assignments, challenge_section_approvals, challenge_status_history, challenge_submissions, challenges, cogni_notifications, communication_log, community_posts, composite_interview_slots, curation_progress, curation_quality_metrics, curator_corrections, curator_section_actions, delegated_soa_scope_audit, dispute_records, duplicate_reviews, email_otp_verifications, enrollment_deletion_audit, enterprise_agreement_audit, enterprise_agreements, enterprise_contact_requests, escrow_installments, escrow_records, evaluation_records, interview_bookings, interview_evaluations, interview_question_responses, interview_slots, ip_transfer_records, legal_reacceptance_records, legal_review_requests, md_mpa_config_audit, md_rbac_msme_config, modification_points, notification_audit_log, notification_retry_queue, open_queue_entries, org_admin_change_requests, org_compliance_config, org_custom_fields, org_finance_config, org_governance_overrides, org_legal_document_templates, org_roles, org_shadow_pricing, org_state_audit_log, org_users, panel_reviewers, pending_challenge_refs, pending_role_legal_acceptance, platform_admin_profile_audit_log, platform_admin_verifications, platform_provider_pool, platform_stats_cache, proof_point_files, proof_point_links, proof_point_reviews, proof_point_speciality_tags, proof_points, provider_certifications, provider_expertise, provider_industry_enrollments, provider_notifications, provider_org_details, provider_performance_scores, provider_proficiency_areas, provider_solution_types, provider_specialities, pulse_card_engagements, pulse_card_flags, pulse_card_layers, pulse_card_votes, pulse_cards, pulse_cards_reputation_log, pulse_comments, pulse_connections, pulse_content, pulse_content_impressions, pulse_content_reports, pulse_content_tags, pulse_daily_standups, pulse_engagements, pulse_loot_boxes, pulse_moderation_actions, pulse_notifications, pulse_provider_stats, pulse_skills, pulse_trust_council, pulse_xp_audit_log, pulse_xp_snapshots, question_exposure_log, rating_records, reassignment_requests, registrant_communications, registration_payments, role_audit_log, role_readiness_cache, saas_agreements, seeker_billing_info, seeker_challenge_topups, seeker_compliance, seeker_contacts, seeker_invoice_line_items, seeker_invoices, seeker_memberships, seeker_onboarding, seeker_org_documents, seeker_org_geographies, seeker_org_industries, seeker_org_operating_geographies, seeker_organization_audit, seeker_organizations, seeker_subscriptions, seeking_org_admins, sla_timers, solution_access_log, solution_provider_invitations, solution_provider_organizations, solution_providers, solutions, solver_challenge_feedback, solver_enrollments, solver_profile_views, solver_profiles, student_profiles, submission_purge_log, tc_acceptances, tier_permissions_audit, user_challenge_roles, user_invitations, verification_assignment_log, verification_assignments, verification_check_results, vip_invitations.

`md_rbac_msme_config` is included only because its rows belong to organisations being deleted and reference them with cascading deletion. Platform-wide configuration remains unchanged.

## Public tables — clear except retained administrator rows (7)

- `profiles` — retain only your profile.
- `platform_admin_profiles` — retain only your administrator profile.
- `user_roles` — retain only your platform access roles.
- `role_assignments` — retain only your platform-level assignments; organisation/challenge assignments are removed.
- `rbac_admin_contact` — retain only your matching contact row, if present.
- `legal_acceptance_ledger` — retain only your current global acceptances; challenge-linked rows are removed.
- `legal_acceptance_log` — retain only your current global acceptance records needed for access; other history is removed.

## Public tables — keep unchanged (95)

academic_disciplines, academic_streams, academic_subjects, ai_legal_review_config, ai_review_frameworks, ai_review_global_config, ai_review_section_config, capability_tags, communication_permissions, completeness_checks, complexity_dimensions, countries, expertise_levels, geography_context, industry_knowledge_packs, industry_segments, interview_kit_competencies, interview_kit_questions, interview_quorum_requirements, legal_doc_trigger_config, legal_document_templates, level_speciality_map, lifecycle_stages, master_complexity_params, md_availability_statuses, md_billing_cycles, md_blocked_email_domains, md_challenge_active_statuses, md_challenge_base_fees, md_challenge_complexity, md_company_sizes, md_country_subdivisions, md_data_residency, md_departments, md_engagement_models, md_enterprise_feature_gate_keys, md_export_control_statuses, md_functional_areas, md_governance_field_rules, md_governance_mode_config, md_industries, md_ip_models, md_languages, md_legal_review_thresholds, md_lifecycle_phase_config, md_membership_tiers, md_mpa_config, md_org_types, md_payment_methods_availability, md_platform_fees, md_postal_formats, md_proficiency_levels, md_role_assignment_statuses, md_shadow_pricing, md_slm_role_codes, md_solution_maturity, md_solution_types, md_solver_eligibility, md_states_provinces, md_status_set_values, md_status_sets, md_status_transitions, md_subscription_tiers, md_subsidized_pricing, md_system_config, md_tax_formats, md_tier_country_pricing, md_tier_engagement_access, md_tier_features, md_tier_governance_access, non_monetary_incentives, notification_routing, org_type_industry_segments, org_type_seeker_rules, organization_types, participation_modes, performance_score_weights, phase_templates, platform_roles, platform_terms, proficiency_area_solution_type_map, proficiency_areas, pulse_card_topics, pulse_tags, question_bank, question_capability_tags, rate_cards, role_authority_matrix, role_conflict_rules, section_example_library, specialities, sub_domains, system_settings, tc_versions, tier_permissions.

## Authentication tables

### Clear completely

`auth.audit_log_entries`, `auth.flow_state`, `auth.one_time_tokens`, `auth.mfa_challenges`, `auth.oauth_client_states`, `auth.saml_relay_states`, `auth.webauthn_challenges`.

### Clear other users, retain your administrator records

`auth.users`, `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_amr_claims`, `auth.mfa_factors`, `auth.mfa_recovery_code_sets`, `auth.mfa_recovery_codes`, `auth.oauth_authorizations`, `auth.oauth_consents`, `auth.scim_users`, `auth.webauthn_credentials`.

### Keep unchanged

`auth.custom_oauth_providers`, `auth.instances`, `auth.oauth_clients`, `auth.saml_providers`, `auth.scim_tokens`, `auth.sso_domains`, `auth.sso_providers`, `auth.schema_migrations`.

## Storage tables and files

- `storage.objects`: remove all test files except the three files referenced by kept `legal_document_templates` records.
- `storage.s3_multipart_uploads` and `storage.s3_multipart_uploads_parts`: clear incomplete test uploads.
- Keep unchanged: `storage.buckets`, `storage.buckets_analytics`, `storage.buckets_vectors`, `storage.migrations`, `storage.vector_indexes`.
- Bucket definitions and their access rules are not changed.

## Execution and reporting after approval

1. Capture exact before counts for every listed table.
2. Remove files and rows in dependency order, preserving only the approved administrator and legal-template exceptions.
3. Capture exact after counts and verify all kept configuration/master rows are unchanged.
4. Provide a per-table before/after report, including authentication and storage.
5. If a database reference would force a kept configuration row to change or force another user to remain, stop and ask rather than guessing.

No tables, functions, triggers, policies, jobs, settings, notifications, or screens will be created, replaced, dropped, or redesigned for this cleanup.
