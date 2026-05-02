-- Extend allowed document_code values on legal_document_templates
ALTER TABLE public.legal_document_templates
  DROP CONSTRAINT IF EXISTS legal_document_templates_document_code_check;

ALTER TABLE public.legal_document_templates
  ADD CONSTRAINT legal_document_templates_document_code_check
  CHECK (document_code = ANY (ARRAY[
    'PMA','CA','PSA','IPAA','EPIA',
    'SPA','SKPA','PWA','RA_R2',
    'CPA_QUICK','CPA_STRUCTURED','CPA_CONTROLLED',
    'PRIVACY_POLICY','DPA'
  ]));

-- Extend allowed document_code values on legal_doc_trigger_config
ALTER TABLE public.legal_doc_trigger_config
  DROP CONSTRAINT IF EXISTS legal_doc_trigger_config_document_code_check;

ALTER TABLE public.legal_doc_trigger_config
  ADD CONSTRAINT legal_doc_trigger_config_document_code_check
  CHECK (document_code = ANY (ARRAY[
    'PMA','CA','PSA','IPAA','EPIA',
    'SPA','SKPA','PWA','RA_R2',
    'CPA_QUICK','CPA_STRUCTURED','CPA_CONTROLLED',
    'PRIVACY_POLICY','DPA'
  ]));

-- Seed empty DRAFT templates for the two new codes (idempotent: only inserts
-- when no row exists for that code yet)
INSERT INTO public.legal_document_templates (
  document_code, document_type, document_name, tier, version,
  version_status, applies_to_model, applies_to_mode, is_mandatory, is_active
)
SELECT 'PRIVACY_POLICY', 'platform', 'Privacy Policy', 'platform', '1.0',
       'DRAFT', 'BOTH', 'ALL', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_document_templates WHERE document_code = 'PRIVACY_POLICY'
);

INSERT INTO public.legal_document_templates (
  document_code, document_type, document_name, tier, version,
  version_status, applies_to_model, applies_to_mode, is_mandatory, is_active
)
SELECT 'DPA', 'platform', 'Data Processing Agreement', 'platform', '1.0',
       'DRAFT', 'BOTH', 'ALL', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_document_templates WHERE document_code = 'DPA'
);