-- Step 1: Add expertise_level_id column to proficiency_areas (nullable first)
ALTER TABLE proficiency_areas 
ADD COLUMN expertise_level_id UUID REFERENCES expertise_levels(id);

-- Step 2: Create index for efficient filtering
CREATE INDEX idx_proficiency_areas_expertise_level ON proficiency_areas(expertise_level_id);

-- Step 3: Replicate existing proficiency areas for all active expertise levels
-- This creates 4 copies of each area (one per level)
INSERT INTO proficiency_areas (industry_segment_id, expertise_level_id, name, description, display_order, is_active)
SELECT 
  pa.industry_segment_id,
  el.id AS expertise_level_id,
  pa.name,
  pa.description,
  pa.display_order,
  pa.is_active
FROM proficiency_areas pa
CROSS JOIN expertise_levels el
WHERE pa.expertise_level_id IS NULL
  AND el.is_active = true;

-- Step 4: Delete the original areas that don't have expertise_level_id set
DELETE FROM proficiency_areas WHERE expertise_level_id IS NULL;

-- Step 5: Make expertise_level_id NOT NULL
ALTER TABLE proficiency_areas ALTER COLUMN expertise_level_id SET NOT NULL;

-- Step 6: Add composite unique constraint (segment + level + name must be unique)
ALTER TABLE proficiency_areas
ADD CONSTRAINT proficiency_areas_segment_level_name_unique 
UNIQUE (industry_segment_id, expertise_level_id, name);