-- Phase 1a: Add department_id column to role_assignments
ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES md_departments(id);

CREATE INDEX IF NOT EXISTS idx_role_assignments_department ON role_assignments(department_id);

-- Phase 1b: Add challenge_requestor_enabled toggle to md_rbac_msme_config
ALTER TABLE md_rbac_msme_config
  ADD COLUMN IF NOT EXISTS challenge_requestor_enabled BOOLEAN NOT NULL DEFAULT false;