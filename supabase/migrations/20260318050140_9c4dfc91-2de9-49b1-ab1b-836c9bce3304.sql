-- Phase 1A: Add trigger_phase to legal_document_templates
-- This maps Tier 2 legal docs to the solution phase that triggers solver acceptance

ALTER TABLE public.legal_document_templates
  ADD COLUMN IF NOT EXISTS trigger_phase INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.legal_document_templates.trigger_phase IS
  'Solution lifecycle phase that triggers solver presentation of this doc (Tier 2 only)';

-- Seed trigger_phase values for existing Tier 2 templates
UPDATE public.legal_document_templates SET trigger_phase = 8
  WHERE document_type = 'solution_eval_consent' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 8
  WHERE document_type = 'ai_usage_policy' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 8
  WHERE document_type = 'ai_similarity_consent' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 10
  WHERE document_type = 'rejection_fee_terms' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 10
  WHERE document_type = 'dispute_resolution' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 11
  WHERE document_type = 'ip_transfer_agreement' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 11
  WHERE document_type = 'escrow_terms' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 11
  WHERE document_type = 'blind_ip_access' AND tier = 'TIER_2';
UPDATE public.legal_document_templates SET trigger_phase = 13
  WHERE document_type = 'withdrawal_terms' AND tier = 'TIER_2';

-- Index for fast lookup by phase
CREATE INDEX IF NOT EXISTS idx_legal_doc_templates_trigger_phase
  ON public.legal_document_templates(trigger_phase)
  WHERE trigger_phase IS NOT NULL;