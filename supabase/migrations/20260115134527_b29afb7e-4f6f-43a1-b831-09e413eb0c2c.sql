-- Phase 1: Create ENUM types for enhanced question bank

-- Question Type: What kind of question is this?
CREATE TYPE question_type AS ENUM (
  'conceptual',      -- Basic understanding (20% - mostly self-assessment)
  'scenario',        -- Applied situations (30% - both modes)
  'experience',      -- Past experience validation (25% - interview)
  'decision',        -- Trade-off/judgment (15% - interview)
  'proof'            -- Evidence-based (10% - senior interview)
);

-- Usage Mode: Where can this question be used?
CREATE TYPE question_usage_mode AS ENUM (
  'self_assessment',  -- Provider self-reflection only
  'interview',        -- Reviewer interview only
  'both'              -- Can be used in either mode
);

-- Difficulty (semantic labels replacing numeric)
CREATE TYPE question_difficulty AS ENUM (
  'introductory',    -- Basic recall, simple facts (Level 1 focus)
  'applied',         -- Straightforward application (Level 1-2)
  'advanced',        -- Analysis and synthesis (Level 2-3)
  'strategic'        -- Expert-level critical thinking (Level 3-4)
);

-- Phase 2: Create Capability Tags Lookup Table
CREATE TABLE capability_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Seed with initial capabilities
INSERT INTO capability_tags (name, description, display_order) VALUES
('analytical_thinking', 'Ability to break down complex problems and identify patterns', 1),
('process_design', 'Designing efficient workflows and operational processes', 2),
('systems_integration', 'Connecting disparate systems and ensuring seamless data flow', 3),
('change_leadership', 'Driving organizational transformation and managing change', 4),
('value_realization', 'Delivering measurable business outcomes and ROI', 5),
('ai_readiness', 'Understanding and applying AI/ML concepts in business context', 6),
('stakeholder_management', 'Managing relationships, expectations, and communications', 7),
('technical_proficiency', 'Deep domain-specific technical knowledge and expertise', 8),
('innovation_mindset', 'Creative problem-solving and continuous improvement approach', 9),
('governance_compliance', 'Ensuring regulatory, policy, and standards adherence', 10);

-- Phase 3: Create Question-Capability Junction Table
CREATE TABLE question_capability_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  capability_tag_id UUID NOT NULL REFERENCES capability_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, capability_tag_id)
);

-- Index for efficient lookups
CREATE INDEX idx_question_capability_question ON question_capability_tags(question_id);
CREATE INDEX idx_question_capability_tag ON question_capability_tags(capability_tag_id);

-- Phase 4: Create Question Exposure Tracking Table
CREATE TABLE question_exposure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  exposure_mode question_usage_mode NOT NULL,
  exposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient cooldown queries
CREATE INDEX idx_question_exposure_provider_question ON question_exposure_log(provider_id, question_id, exposed_at DESC);
CREATE INDEX idx_question_exposure_provider ON question_exposure_log(provider_id);

-- Phase 5: Alter question_bank table to add new columns
ALTER TABLE question_bank
ADD COLUMN question_type question_type NOT NULL DEFAULT 'conceptual',
ADD COLUMN usage_mode question_usage_mode NOT NULL DEFAULT 'both',
ADD COLUMN difficulty question_difficulty,
ADD COLUMN expected_answer_guidance TEXT,
ADD COLUMN updated_by UUID;

-- Migrate existing difficulty_level to new difficulty enum
-- 1 -> introductory, 2 -> applied, 3 -> advanced, 4-5 -> strategic
UPDATE question_bank SET difficulty = 
  CASE 
    WHEN difficulty_level = 1 THEN 'introductory'::question_difficulty
    WHEN difficulty_level = 2 THEN 'applied'::question_difficulty
    WHEN difficulty_level = 3 THEN 'advanced'::question_difficulty
    WHEN difficulty_level >= 4 THEN 'strategic'::question_difficulty
    ELSE 'applied'::question_difficulty
  END;

-- Drop old numeric column after migration
ALTER TABLE question_bank DROP COLUMN difficulty_level;

-- Phase 6: Add RLS Policies for new tables

-- capability_tags: Public read, admin manage
ALTER TABLE capability_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and admin read capability_tags" ON capability_tags
FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Admin manage capability_tags" ON capability_tags
FOR ALL USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Admin delete capability_tags" ON capability_tags
FOR DELETE USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- question_capability_tags: Admin manage, authenticated read
ALTER TABLE question_capability_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage question_capability_tags" ON question_capability_tags
FOR ALL USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Authenticated read question_capability_tags" ON question_capability_tags
FOR SELECT USING (auth.uid() IS NOT NULL);

-- question_exposure_log: Provider sees own, admin sees all
ALTER TABLE question_exposure_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own exposure" ON question_exposure_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM solution_providers sp 
    WHERE sp.id = question_exposure_log.provider_id 
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Providers insert own exposure" ON question_exposure_log
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM solution_providers sp 
    WHERE sp.id = question_exposure_log.provider_id 
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admin manage exposure_log" ON question_exposure_log
FOR ALL USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Add updated_at trigger for capability_tags
CREATE TRIGGER update_capability_tags_updated_at
BEFORE UPDATE ON capability_tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();