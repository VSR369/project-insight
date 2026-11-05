ALTER TABLE public.legal_doc_trigger_config DROP CONSTRAINT legal_doc_trigger_config_trigger_event_check;

ALTER TABLE public.legal_doc_trigger_config ADD CONSTRAINT legal_doc_trigger_config_trigger_event_check
CHECK (trigger_event = ANY (ARRAY['USER_REGISTRATION','SEEKER_ENROLLMENT','SOLVER_ENROLLMENT','CHALLENGE_SUBMIT','CHALLENGE_PUBLISH','CHALLENGE_JOIN','ABSTRACT_SUBMIT','SOLVER_SHORTLISTED','SOLUTION_SUBMIT','SOLUTION_REVIEW','WINNER_SELECTED','WINNER_CONFIRMED','ESCROW_DEPOSIT','PAYMENT_RELEASE']));

INSERT INTO public.legal_doc_trigger_config (document_code, document_section, trigger_event, required_roles, applies_to_mode, is_mandatory, display_order, is_active)
SELECT 'PWA', NULL, 'SOLUTION_REVIEW', ARRAY['ER','CU','CR'], 'ALL', true, 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_doc_trigger_config
  WHERE trigger_event = 'SOLUTION_REVIEW' AND document_code = 'PWA'
);