
-- =====================================================
-- Migration: Solver Enrollments Table
-- Tracks solver enrollment in challenges with model-aware workflow
-- =====================================================

CREATE TABLE public.solver_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  solver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  enrollment_model TEXT NOT NULL CHECK (enrollment_model IN ('OPEN', 'DR', 'OC', 'CE', 'IO')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  legal_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  UNIQUE(challenge_id, solver_id)
);

-- Indexes
CREATE INDEX idx_solver_enrollments_challenge ON public.solver_enrollments(challenge_id, status);
CREATE INDEX idx_solver_enrollments_solver ON public.solver_enrollments(solver_id, status);
CREATE INDEX idx_solver_enrollments_tenant ON public.solver_enrollments(tenant_id);

-- RLS
ALTER TABLE public.solver_enrollments ENABLE ROW LEVEL SECURITY;

-- Solvers can see their own enrollments
CREATE POLICY "Solvers can view own enrollments"
  ON public.solver_enrollments
  FOR SELECT
  TO authenticated
  USING (solver_id = auth.uid());

-- Solvers can insert their own enrollment
CREATE POLICY "Solvers can create own enrollment"
  ON public.solver_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (solver_id = auth.uid());

-- Solvers can update own enrollment (e.g., withdraw)
CREATE POLICY "Sol
vers can update own enrollment"
  ON public.solver_enrollments
  FOR UPDATE
  TO authenticated
  USING (solver_id = auth.uid());

-- Challenge team (tenant members) can view enrollments for their challenges
CREATE POLICY "Tenant members can view challenge enrollments"
  ON public.solver_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = solver_enrollments.challenge_id
      AND c.tenant_id = solver_enrollments.tenant_id
      AND c.is_deleted = false
    )
  );

-- Challenge team can approve/reject enrollments
CREATE POLICY "Tenant members can update challenge enrollments"
  ON public.solver_enrollments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = solver_enrollments.challenge_id
      AND c.tenant_id = solver_enrollments.tenant_id
      AND c.is_deleted = false
    )
  );
