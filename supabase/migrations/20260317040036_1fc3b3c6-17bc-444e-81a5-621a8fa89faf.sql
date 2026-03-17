
-- ============================================================
-- M-01-A: CogniBlend Core Tables Migration
-- Creates: platform_roles, user_challenge_roles, role_conflict_rules
-- Alters: seeker_organizations (adds 4 CogniBlend columns)
-- ============================================================

-- 1. platform_roles — CogniBlend role registry (platform-global lookup)
CREATE TABLE IF NOT EXISTS public.platform_roles (
  role_code TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  role_description TEXT,
  applicable_model TEXT NOT NULL CHECK (applicable_model IN ('MP', 'AGG', 'BOTH')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.platform_roles IS 'CogniBlend platform role definitions (AM, RQ, CR, CU, ID, ER, LC, FC). Separate from md_slm_role_codes which serves the SLM assignment system.';

-- 2. role_conflict_rules — Conflict matrix for role co-assignment
CREATE TABLE IF NOT EXISTS public.role_conflict_rules (
  rule_id SERIAL PRIMARY KEY,
  role_a TEXT NOT NULL REFERENCES public.platform_roles(role_code),
  role_b TEXT NOT NULL REFERENCES public.platform_roles(role_code),
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('HARD_BLOCK', 'SOFT_WARN', 'ALLOWED')),
  applies_scope TEXT NOT NULL CHECK (applies_scope IN ('SAME_CHALLENGE', 'PLATFORM')),
  governance_profile TEXT NOT NULL CHECK (governance_profile IN ('BOTH', 'ENTERPRISE_ONLY')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.role_conflict_rules IS 'Defines which CogniBlend platform roles conflict when co-assigned to the same user within a scope.';

-- 3. user_challenge_roles — Per-challenge governance role assignments for internal org users
CREATE TABLE IF NOT EXISTS public.user_challenge_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES public.platform_roles(role_code),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_assigned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (user_id, challenge_id, role_code)
);

COMMENT ON TABLE public.user_challenge_roles IS 'Maps internal org users to CogniBlend governance roles on specific challenges. Separate from challenge_role_assignments which tracks external provider pool members.';

-- Indexes for user_challenge_roles
CREATE INDEX IF NOT EXISTS idx_user_challenge_roles_challenge_role
  ON public.user_challenge_roles(challenge_id, role_code);
CREATE INDEX IF NOT EXISTS idx_user_challenge_roles_user_active
  ON public.user_challenge_roles(user_id, is_active);

-- 4. Extend seeker_organizations with CogniBlend columns
ALTER TABLE public.seeker_organizations
  ADD COLUMN IF NOT EXISTS governance_profile TEXT NOT NULL DEFAULT 'LIGHTWEIGHT'
    CHECK (governance_profile IN ('LIGHTWEIGHT', 'ENTERPRISE')),
  ADD COLUMN IF NOT EXISTS operating_model TEXT NOT NULL DEFAULT 'MP'
    CHECK (operating_model IN ('MP', 'AGG')),
  ADD COLUMN IF NOT EXISTS max_concurrent_active INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_cumulative_quota INTEGER NOT NULL DEFAULT 5;

-- ============================================================
-- RLS Policies
-- ============================================================

-- platform_roles: read-only lookup for authenticated users
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform_roles"
  ON public.platform_roles FOR SELECT
  TO authenticated
  USING (true);

-- role_conflict_rules: read-only lookup for authenticated users
ALTER TABLE public.role_conflict_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_conflict_rules"
  ON public.role_conflict_rules FOR SELECT
  TO authenticated
  USING (true);

-- user_challenge_roles: authenticated can SELECT; INSERT own rows or admin
ALTER TABLE public.user_challenge_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read user_challenge_roles"
  ON public.user_challenge_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own challenge roles"
  ON public.user_challenge_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own challenge roles"
  ON public.user_challenge_roles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
