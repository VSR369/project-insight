CREATE OR REPLACE FUNCTION public.trg_tier_permissions_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.tier_permissions_audit (permission_key, tier, previous_value, new_value, changed_by_id)
    VALUES (NEW.permission_key, NEW.tier, OLD.is_enabled, NEW.is_enabled, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.tier_permissions SET is_enabled = true, updated_at = now() WHERE tier = 'admin' AND permission_key IN ('master_data.view', 'taxonomy.view');

DELETE FROM public.tier_permissions WHERE permission_key = 'marketplace.manage_config';

INSERT INTO public.tier_permissions (tier, permission_key, is_enabled) VALUES
  ('admin','marketplace.manage_admin_contact', false),
  ('senior_admin','marketplace.manage_admin_contact', true),
  ('supervisor','marketplace.manage_admin_contact', true),
  ('admin','marketplace.manage_email_templates', false),
  ('senior_admin','marketplace.manage_email_templates', false),
  ('supervisor','marketplace.manage_email_templates', true),
  ('admin','org_approvals.suspend_reinstate', false),
  ('senior_admin','org_approvals.suspend_reinstate', false),
  ('supervisor','org_approvals.suspend_reinstate', true),
  ('admin','interview.approve_certifications', false),
  ('senior_admin','interview.approve_certifications', true),
  ('supervisor','interview.approve_certifications', true),
  ('admin','interview.decide_moderated_results', false),
  ('senior_admin','interview.decide_moderated_results', true),
  ('supervisor','interview.decide_moderated_results', true),
  ('admin','interview.manage_provider_enrolments', false),
  ('senior_admin','interview.manage_provider_enrolments', true),
  ('supervisor','interview.manage_provider_enrolments', true),
  ('admin','interview.decide_certification_appeals', false),
  ('senior_admin','interview.decide_certification_appeals', true),
  ('supervisor','interview.decide_certification_appeals', true),
  ('admin','interview.configure_certification_lifecycle', false),
  ('senior_admin','interview.configure_certification_lifecycle', true),
  ('supervisor','interview.configure_certification_lifecycle', true),
  ('admin','interview.configure_reviewer_availability', false),
  ('senior_admin','interview.configure_reviewer_availability', true),
  ('supervisor','interview.configure_reviewer_availability', true),
  ('admin','legal_documents.view', true),
  ('senior_admin','legal_documents.view', true),
  ('supervisor','legal_documents.view', true),
  ('admin','legal_documents.edit_drafts', false),
  ('senior_admin','legal_documents.edit_drafts', true),
  ('supervisor','legal_documents.edit_drafts', true),
  ('admin','legal_documents.publish', false),
  ('senior_admin','legal_documents.publish', true),
  ('supervisor','legal_documents.publish', true),
  ('admin','legal_documents.view_acceptance_ledger', false),
  ('senior_admin','legal_documents.view_acceptance_ledger', true),
  ('supervisor','legal_documents.view_acceptance_ledger', true),
  ('admin','challenge_oversight.view', true),
  ('senior_admin','challenge_oversight.view', true),
  ('supervisor','challenge_oversight.view', true),
  ('admin','challenge_oversight.resolve_disputes', false),
  ('senior_admin','challenge_oversight.resolve_disputes', true),
  ('supervisor','challenge_oversight.resolve_disputes', true),
  ('admin','challenge_oversight.cancel_after_submissions', false),
  ('senior_admin','challenge_oversight.cancel_after_submissions', true),
  ('supervisor','challenge_oversight.cancel_after_submissions', true),
  ('admin','challenge_oversight.change_default_governance_profile', false),
  ('senior_admin','challenge_oversight.change_default_governance_profile', false),
  ('supervisor','challenge_oversight.change_default_governance_profile', true)
ON CONFLICT DO NOTHING;