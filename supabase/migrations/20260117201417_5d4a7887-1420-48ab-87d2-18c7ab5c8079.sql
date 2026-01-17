-- Migration: Add default_quorum_count to expertise_levels and updated_by to interview_quorum_requirements
-- Also add RLS policies for admin management

-- 1. Add default_quorum_count column to expertise_levels
ALTER TABLE expertise_levels
ADD COLUMN IF NOT EXISTS default_quorum_count INTEGER NOT NULL DEFAULT 3;

-- Add CHECK constraint
ALTER TABLE expertise_levels
ADD CONSTRAINT chk_expertise_levels_default_quorum 
CHECK (default_quorum_count > 0 AND default_quorum_count <= 20);

COMMENT ON COLUMN expertise_levels.default_quorum_count IS 
'Default number of reviewers required for interviews at this expertise level';

-- 2. Add updated_by column to interview_quorum_requirements
ALTER TABLE interview_quorum_requirements
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 3. Add created_by column to interview_quorum_requirements
ALTER TABLE interview_quorum_requirements
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 4. Create or replace the update_updated_at trigger for this table
CREATE OR REPLACE FUNCTION update_interview_quorum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_interview_quorum_requirements_updated_at ON interview_quorum_requirements;

CREATE TRIGGER update_interview_quorum_requirements_updated_at
  BEFORE UPDATE ON interview_quorum_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_quorum_updated_at();

-- 5. Add unique constraint for upsert on (expertise_level_id, industry_segment_id)
-- Use COALESCE trick for null-safe unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_iqr_expertise_industry_unique 
ON interview_quorum_requirements (expertise_level_id, COALESCE(industry_segment_id, '00000000-0000-0000-0000-000000000000'::uuid));