-- =====================================================
-- Fix interview_quorum_requirements unique constraint for upsert
-- =====================================================

-- Step 1: Drop existing constraint (not the index)
ALTER TABLE interview_quorum_requirements 
  DROP CONSTRAINT IF EXISTS unique_level_industry_quorum;

-- Step 2: Delete duplicates, keeping the most recent one per (expertise_level_id, industry_segment_id)
DELETE FROM interview_quorum_requirements iqr1
WHERE id NOT IN (
  SELECT DISTINCT ON (expertise_level_id, COALESCE(industry_segment_id, '00000000-0000-0000-0000-000000000000'::uuid))
    id
  FROM interview_quorum_requirements
  ORDER BY expertise_level_id, COALESCE(industry_segment_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(updated_at, created_at) DESC
);

-- Step 3: Create a unique index using COALESCE to handle NULL industry_segment_id properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_iqr_level_industry_unique 
  ON interview_quorum_requirements (
    expertise_level_id, 
    COALESCE(industry_segment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Step 4: Add index for common query patterns
CREATE INDEX IF NOT EXISTS idx_iqr_active_lookup 
  ON interview_quorum_requirements (is_active, expertise_level_id, industry_segment_id);