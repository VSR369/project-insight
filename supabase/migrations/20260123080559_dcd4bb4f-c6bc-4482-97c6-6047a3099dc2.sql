-- =====================================================
-- Enhanced Enrollment Deletion Audit & Tracking
-- Adds audit table for force deletions
-- =====================================================

-- Create enrollment_deletion_audit table for detailed logging
CREATE TABLE IF NOT EXISTS public.enrollment_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  industry_segment_id UUID NOT NULL,
  industry_name TEXT,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  was_force_delete BOOLEAN DEFAULT false,
  blockers_overridden JSONB,
  affected_data JSONB,
  stakeholders_notified JSONB,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.enrollment_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own deletion audit records
CREATE POLICY "Users can view own deletion audits"
ON public.enrollment_deletion_audit
FOR SELECT
USING (deleted_by = auth.uid());

-- Platform admins can view all deletion audits
CREATE POLICY "Platform admins can view all deletion audits"
ON public.enrollment_deletion_audit
FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Allow authenticated users to insert (system creates records)
CREATE POLICY "Authenticated users can insert deletion audits"
ON public.enrollment_deletion_audit
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_deletion_audit_provider 
ON public.enrollment_deletion_audit(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_by 
ON public.enrollment_deletion_audit(deleted_by, created_at DESC);