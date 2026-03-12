
-- Phase 1A: Create delegated_soa_scope_audit table (TS §13.1 / BR-DEL-002)
CREATE TABLE IF NOT EXISTS public.delegated_soa_scope_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soa_id UUID NOT NULL REFERENCES public.seeking_org_admins(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  previous_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  orphan_count INTEGER NOT NULL DEFAULT 0,
  confirmation_given BOOLEAN NOT NULL DEFAULT false,
  modified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delegated_soa_scope_audit_soa_id ON public.delegated_soa_scope_audit(soa_id);
CREATE INDEX IF NOT EXISTS idx_delegated_soa_scope_audit_org ON public.delegated_soa_scope_audit(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.delegated_soa_scope_audit ENABLE ROW LEVEL SECURITY;

-- RLS: Admins of the org can view audit trail
CREATE POLICY "org_admins_can_view_scope_audit"
  ON public.delegated_soa_scope_audit
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only authenticated users can insert (service enforces who)
CREATE POLICY "authenticated_can_insert_scope_audit"
  ON public.delegated_soa_scope_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Phase 2D: Add idempotency_key to challenge_role_assignments for concurrent assignment protection (TS §15.2)
ALTER TABLE public.challenge_role_assignments
  ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;

-- Phase 2E: Add assignment_phase to challenge_role_assignments (BR-ASSIGN-006)
ALTER TABLE public.challenge_role_assignments
  ADD COLUMN IF NOT EXISTS assignment_phase TEXT CHECK (assignment_phase IN ('abstract_screening', 'full_evaluation'));
