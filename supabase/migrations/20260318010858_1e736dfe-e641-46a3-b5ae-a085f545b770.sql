
-- =====================================================
-- Migration: Add 5 BRD §5.7.1 Solver Eligibility Models
-- Adds tier mapping columns + 5 new eligibility models
-- =====================================================

-- 1. Add tier mapping columns to md_solver_eligibility
ALTER TABLE public.md_solver_eligibility
  ADD COLUMN IF NOT EXISTS default_visibility TEXT,
  ADD COLUMN IF NOT EXISTS default_enrollment TEXT,
  ADD COLUMN IF NOT EXISTS default_submission TEXT,
  ADD COLUMN IF NOT EXISTS model_category TEXT DEFAULT 'legacy';

-- 2. Insert the 5 BRD §5.7.1 models
INSERT INTO public.md_solver_eligibility
  (code, label, description, requires_auth, requires_provider_record, requires_certification, min_star_rating, display_order, default_visibility, default_enrollment, default_submission, model_category)
VALUES
  ('CE', 'Curated Expert', 'Platform-verified experts only — highest quality bar. Experts are pre-vetted through the platform''s certification and curation process.', true, true, true, 3, 100, 'curated_experts', 'curator_approved', 'shortlisted_only', 'brd_5_7_1'),
  ('IO', 'Invitation Only', 'Seeker invites specific solvers directly. Full control over who participates — ideal for sensitive or confidential challenges.', true, false, false, NULL, 110, 'invited_only', 'invitation_only', 'invited_solvers', 'brd_5_7_1'),
  ('DR', 'Direct Registration', 'Open enrollment with NDA requirement. Any registered user can join after signing a non-disclosure agreement.', true, false, false, NULL, 120, 'registered_users', 'direct_nda', 'all_enrolled', 'brd_5_7_1'),
  ('OC', 'Organization-Curated', 'Enrollment managed by the seeking organization''s pre-approved solver pool. The org controls who gets access.', true, false, false, NULL, 130, 'platform_members', 'org_curated', 'all_enrolled', 'brd_5_7_1'),
  ('OPEN', 'Open', 'Anyone registered on the platform can see, enroll, and submit. Maximum reach and participation.', true, false, false, NULL, 140, 'public', 'open_auto', 'all_enrolled', 'brd_5_7_1')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  default_visibility = EXCLUDED.default_visibility,
  default_enrollment = EXCLUDED.default_enrollment,
  default_submission = EXCLUDED.default_submission,
  model_category = EXCLUDED.model_category,
  display_order = EXCLUDED.display_order;

-- 3. Update existing 8 legacy categories with model_category tag
UPDATE public.md_solver_eligibility
  SET model_category = 'legacy'
  WHERE model_category IS NULL AND code NOT IN ('CE', 'IO', 'DR', 'OC', 'OPEN');
