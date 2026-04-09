
-- Drop old restrictive constraints
ALTER TABLE public.legal_document_templates
  DROP CONSTRAINT IF EXISTS legal_document_templates_document_code_check;

ALTER TABLE public.legal_document_templates
  DROP CONSTRAINT IF EXISTS legal_document_templates_tier_check;

-- Add expanded constraints
ALTER TABLE public.legal_document_templates
  ADD CONSTRAINT legal_document_templates_document_code_check
  CHECK (document_code = ANY (ARRAY[
    'PMA','CA','PSA','IPAA','EPIA',
    'SPA','SKPA','PWA',
    'CPA_QUICK','CPA_STRUCTURED','CPA_CONTROLLED'
  ]));

ALTER TABLE public.legal_document_templates
  ADD CONSTRAINT legal_document_templates_tier_check
  CHECK (tier = ANY (ARRAY['TIER_1','TIER_2','platform','challenge']));

-- Deactivate old docs
UPDATE public.legal_document_templates
SET is_active = false,
    version_status = 'ARCHIVED',
    updated_at = now()
WHERE document_code IN ('PMA', 'CA', 'PSA', 'IPAA', 'EPIA')
  AND is_active = true;

-- Insert new platform agreements
INSERT INTO public.legal_document_templates (
  template_id, document_code, document_type, document_name, tier, version,
  version_status, description, summary, applies_to_roles, applies_to_model,
  applies_to_mode, is_mandatory, is_active, sections
) VALUES
(
  gen_random_uuid(), 'SPA', 'platform_agreement',
  'Solver Platform Agreement', 'platform', '1.0', 'ACTIVE',
  'Master agreement governing solver participation on the platform including conduct, IP defaults, and payment terms.',
  'Covers solver rights, obligations, conduct standards, default IP assignment, and payment processing terms.',
  ARRAY['solver'], 'BOTH', 'ALL', true, true, '{}'::jsonb
),
(
  gen_random_uuid(), 'SKPA', 'platform_agreement',
  'Seeker Platform Agreement', 'platform', '1.0', 'ACTIVE',
  'Master agreement governing seeker organization participation including challenge posting, escrow, and compliance obligations.',
  'Covers seeker rights, challenge posting rules, escrow requirements, data handling, and platform fee structure.',
  ARRAY['seeker'], 'BOTH', 'ALL', true, true, '{}'::jsonb
),
(
  gen_random_uuid(), 'PWA', 'challenge_agreement',
  'Prize & Work Agreement', 'challenge', '1.0', 'ACTIVE',
  'Challenge-specific agreement covering prize structure, IP assignment, deliverables, and winner obligations.',
  'Assembled per-challenge from org templates. Covers prize terms, IP transfer, deliverable specs, and winner responsibilities.',
  ARRAY['solver','seeker'], 'BOTH', 'ALL', true, true, '{}'::jsonb
)
ON CONFLICT DO NOTHING;
