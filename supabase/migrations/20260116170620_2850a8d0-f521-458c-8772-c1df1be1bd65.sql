-- Phase 1: Lifecycle Governance Schema Updates
-- ============================================

-- 1.1 Expand lifecycle_status enum with new values
DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'mode_selected' AFTER 'enrolled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'org_info_pending' AFTER 'mode_selected';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'org_validated' AFTER 'org_info_pending';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'expertise_selected' AFTER 'org_validated';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'proof_points_started' AFTER 'expertise_selected';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'proof_points_min_met' AFTER 'proof_points_started';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'assessment_in_progress' AFTER 'proof_points_min_met';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'assessment_passed' AFTER 'assessment_in_progress';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'panel_scheduled' AFTER 'assessment_passed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'panel_completed' AFTER 'panel_scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'certified' AFTER 'verified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'not_verified' AFTER 'certified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.2 Create lifecycle_stages lookup table
CREATE TABLE IF NOT EXISTS lifecycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_code TEXT NOT NULL UNIQUE,
  rank INTEGER NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  locks_configuration BOOLEAN DEFAULT FALSE,
  locks_content BOOLEAN DEFAULT FALSE,
  locks_everything BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE lifecycle_stages ENABLE ROW LEVEL SECURITY;

-- Public read policy (reference data)
CREATE POLICY "lifecycle_stages_read_all" ON lifecycle_stages
  FOR SELECT USING (true);

-- Insert all 16 stages with lock flags
INSERT INTO lifecycle_stages (status_code, rank, display_name, description, locks_configuration, locks_content, locks_everything) VALUES
('invited', 10, 'Invited', 'User has been invited to the platform', false, false, false),
('registered', 15, 'Registered', 'User has completed registration', false, false, false),
('enrolled', 20, 'Enrolled', 'User has started onboarding', false, false, false),
('mode_selected', 30, 'Mode Selected', 'Participation mode has been chosen', false, false, false),
('org_info_pending', 35, 'Org Info Pending', 'Waiting for organization validation', false, false, false),
('org_validated', 40, 'Org Validated', 'Organization has been validated', false, false, false),
('expertise_selected', 50, 'Expertise Selected', 'Expertise level has been chosen', false, false, false),
('profile_building', 55, 'Profile Building', 'User is building their profile', false, false, false),
('proof_points_started', 60, 'Proof Points Started', 'User has begun adding proof points', false, false, false),
('proof_points_min_met', 70, 'Proof Points Min Met', 'Minimum proof points requirement met', false, false, false),
('assessment_pending', 90, 'Assessment Pending', 'Ready for assessment', false, false, false),
('assessment_in_progress', 100, 'Assessment In Progress', 'Assessment is currently in progress', true, false, false),
('assessment_completed', 105, 'Assessment Completed', 'Assessment has been completed', true, false, false),
('assessment_passed', 110, 'Assessment Passed', 'Assessment has been passed', true, false, false),
('panel_scheduled', 120, 'Panel Scheduled', 'Interview panel has been scheduled', true, true, false),
('panel_completed', 130, 'Panel Completed', 'Interview panel has been completed', true, true, false),
('verified', 140, 'Verified', 'Provider has been verified', true, true, true),
('certified', 150, 'Certified', 'Provider has been certified', true, true, true),
('not_verified', 160, 'Not Verified', 'Provider was not verified', true, true, true),
('active', 145, 'Active', 'Provider is active on platform', true, true, true),
('suspended', 200, 'Suspended', 'Provider account is suspended', true, true, true),
('inactive', 210, 'Inactive', 'Provider account is inactive', true, true, true)
ON CONFLICT (status_code) DO NOTHING;

-- 1.3 Create system_settings table for configurable parameters
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy (reference data)
CREATE POLICY "system_settings_read_all" ON system_settings
  FOR SELECT USING (true);

-- Admin update policy
CREATE POLICY "system_settings_admin_update" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'platform_admin'
    )
  );

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('assessment_max_retakes', '{"value": 3}', 'Maximum assessment retakes allowed per 90-day period'),
('assessment_retake_period_days', '{"value": 90}', 'Period in days for retake limit calculation'),
('panel_max_reschedules', '{"value": 2}', 'Maximum number of times a panel can be rescheduled'),
('proof_points_minimum', '{"value": 2}', 'Minimum proof points required to proceed')
ON CONFLICT (setting_key) DO NOTHING;

-- 1.4 Create transactional cascade reset functions

-- Industry change reset (deletes ONLY specialty proof points, keeps general)
CREATE OR REPLACE FUNCTION execute_industry_change_reset(
  p_provider_id UUID,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  -- Soft-delete specialty-specific proof points only (keep general)
  UPDATE proof_points 
  SET is_deleted = true, deleted_at = NOW(), deleted_by = p_user_id
  WHERE provider_id = p_provider_id 
    AND category = 'specialty_specific'
    AND is_deleted = false;

  -- Delete all speciality tag associations
  DELETE FROM proof_point_speciality_tags 
  WHERE proof_point_id IN (
    SELECT id FROM proof_points WHERE provider_id = p_provider_id
  );

  -- Delete all provider speciality selections
  DELETE FROM provider_specialities WHERE provider_id = p_provider_id;

  -- Delete all proficiency area selections
  DELETE FROM provider_proficiency_areas WHERE provider_id = p_provider_id;

  -- Clear expertise level and reset lifecycle
  UPDATE solution_providers 
  SET expertise_level_id = NULL, 
      lifecycle_status = 'enrolled', 
      lifecycle_rank = 20,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Expertise level change reset (deletes specialty proof points, keeps general)
CREATE OR REPLACE FUNCTION execute_expertise_change_reset(
  p_provider_id UUID,
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  -- Soft-delete specialty-specific proof points
  UPDATE proof_points 
  SET is_deleted = true, deleted_at = NOW(), deleted_by = p_user_id
  WHERE provider_id = p_provider_id 
    AND category = 'specialty_specific'
    AND is_deleted = false;

  -- Delete speciality tag associations
  DELETE FROM proof_point_speciality_tags 
  WHERE proof_point_id IN (
    SELECT id FROM proof_points WHERE provider_id = p_provider_id
  );

  -- Delete provider speciality selections
  DELETE FROM provider_specialities WHERE provider_id = p_provider_id;

  -- Delete proficiency area selections
  DELETE FROM provider_proficiency_areas WHERE provider_id = p_provider_id;

  -- Update lifecycle status
  UPDATE solution_providers 
  SET lifecycle_status = 'expertise_selected', 
      lifecycle_rank = 50,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to get cascade impact counts
CREATE OR REPLACE FUNCTION get_cascade_impact_counts(
  p_provider_id UUID
) RETURNS TABLE (
  specialty_proof_points_count INTEGER,
  general_proof_points_count INTEGER,
  specialities_count INTEGER,
  proficiency_areas_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM proof_points 
     WHERE provider_id = p_provider_id AND category = 'specialty_specific' AND is_deleted = false),
    (SELECT COUNT(*)::INTEGER FROM proof_points 
     WHERE provider_id = p_provider_id AND category = 'general' AND is_deleted = false),
    (SELECT COUNT(*)::INTEGER FROM provider_specialities WHERE provider_id = p_provider_id),
    (SELECT COUNT(*)::INTEGER FROM provider_proficiency_areas WHERE provider_id = p_provider_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;