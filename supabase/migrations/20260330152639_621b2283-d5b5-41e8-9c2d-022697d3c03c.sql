-- Part A: Social & web presence fields on seeker_organizations
ALTER TABLE seeker_organizations
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS functional_areas TEXT[] DEFAULT '{}';

-- Part B: Challenge-level context fields
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS industry_segment_id UUID REFERENCES industry_segments(id),
  ADD COLUMN IF NOT EXISTS functional_area TEXT,
  ADD COLUMN IF NOT EXISTS target_geography TEXT;

-- Part C: Challenge attachments for document reading by AI
CREATE TABLE IF NOT EXISTS challenge_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  extraction_method TEXT,
  extraction_status TEXT DEFAULT 'pending',
  extraction_error TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_attachments_lookup
  ON challenge_attachments(challenge_id, section_key);

ALTER TABLE challenge_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage challenge attachments"
  ON challenge_attachments FOR ALL
  USING (true) WITH CHECK (true);