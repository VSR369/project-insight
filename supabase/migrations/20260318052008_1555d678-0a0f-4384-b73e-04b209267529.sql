
-- Phase 5: GAP-13 — Communication Permissions Matrix
-- Defines which roles can communicate with which other roles, scoped by phase range.

CREATE TABLE IF NOT EXISTS public.communication_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  challenge_phase_min INTEGER NOT NULL DEFAULT 1,
  challenge_phase_max INTEGER NOT NULL DEFAULT 13,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(from_role, to_role, challenge_phase_min, challenge_phase_max)
);

ALTER TABLE public.communication_permissions ENABLE ROW LEVEL SECURITY;

-- Platform-global table, read access for all authenticated users
CREATE POLICY "Authenticated users can read communication permissions"
  ON public.communication_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_comm_perms_roles ON public.communication_permissions(from_role, to_role);

COMMENT ON TABLE public.communication_permissions IS 'Role-to-role communication permission matrix (BRD §6.4 GAP-13)';

-- Seed BRD rules:
-- Solvers cannot message ER (Evaluation Reviewer) directly
-- Solvers cannot message ID (Innovation Director) directly
-- Solvers can message CU (Curator) via Q&A only
-- All other role-to-role communications are allowed by default

-- Block: Solver → ER (all phases)
INSERT INTO public.communication_permissions (from_role, to_role, allowed)
VALUES ('SOLVER', 'ER', false)
ON CONFLICT DO NOTHING;

-- Block: Solver → ID (all phases)
INSERT INTO public.communication_permissions (from_role, to_role, allowed)
VALUES ('SOLVER', 'ID', false)
ON CONFLICT DO NOTHING;

-- Block: Solver → FC (all phases)
INSERT INTO public.communication_permissions (from_role, to_role, allowed)
VALUES ('SOLVER', 'FC', false)
ON CONFLICT DO NOTHING;

-- Block: Solver → LC (all phases)
INSERT INTO public.communication_permissions (from_role, to_role, allowed)
VALUES ('SOLVER', 'LC', false)
ON CONFLICT DO NOTHING;

-- Allow: Solver → CU (Q&A channel, phases 7-13)
INSERT INTO public.communication_permissions (from_role, to_role, challenge_phase_min, challenge_phase_max, allowed)
VALUES ('SOLVER', 'CU', 7, 13, true)
ON CONFLICT DO NOTHING;

-- Allow: Solver → AM (phases 7-13)
INSERT INTO public.communication_permissions (from_role, to_role, challenge_phase_min, challenge_phase_max, allowed)
VALUES ('SOLVER', 'AM', 7, 13, true)
ON CONFLICT DO NOTHING;

-- Allow: Solver → RQ (phases 7-13 for AGG model)
INSERT INTO public.communication_permissions (from_role, to_role, challenge_phase_min, challenge_phase_max, allowed)
VALUES ('SOLVER', 'RQ', 7, 13, true)
ON CONFLICT DO NOTHING;
