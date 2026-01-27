-- =====================================================
-- Interview KIT Question Bank - Tables, Indexes, RLS, Seed Data
-- Per Project Knowledge Standards v3.1
-- =====================================================

-- Table: interview_kit_competencies (Master Data - 5 Universal Competencies)
CREATE TABLE public.interview_kit_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT interview_kit_competencies_name_unique UNIQUE (name),
  CONSTRAINT interview_kit_competencies_code_unique UNIQUE (code)
);

-- Table: interview_kit_questions
CREATE TABLE public.interview_kit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_segment_id UUID NOT NULL REFERENCES public.industry_segments(id),
  expertise_level_id UUID NOT NULL REFERENCES public.expertise_levels(id),
  competency_id UUID NOT NULL REFERENCES public.interview_kit_competencies(id),
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- Indexes (Per Project Knowledge Section 6.4)
-- =====================================================

-- Competencies indexes
CREATE INDEX idx_interview_kit_competencies_active 
  ON public.interview_kit_competencies(is_active, display_order);

-- Questions indexes for common query patterns
CREATE INDEX idx_interview_kit_questions_industry 
  ON public.interview_kit_questions(industry_segment_id, is_active);
CREATE INDEX idx_interview_kit_questions_level 
  ON public.interview_kit_questions(expertise_level_id, is_active);
CREATE INDEX idx_interview_kit_questions_competency 
  ON public.interview_kit_questions(competency_id, is_active);
CREATE INDEX idx_interview_kit_questions_combo 
  ON public.interview_kit_questions(industry_segment_id, expertise_level_id, competency_id, is_active);

-- =====================================================
-- RLS Policies (Per Project Knowledge Section 7)
-- =====================================================

-- Enable RLS
ALTER TABLE public.interview_kit_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_kit_questions ENABLE ROW LEVEL SECURITY;

-- Competencies: Public read active, Admin full manage
CREATE POLICY "Public read active interview_kit_competencies"
  ON public.interview_kit_competencies FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Admin manage interview_kit_competencies"
  ON public.interview_kit_competencies FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Questions: Admin manage, Active reviewers read active
CREATE POLICY "Admin manage interview_kit_questions"
  ON public.interview_kit_questions FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Reviewers read active interview_kit_questions"
  ON public.interview_kit_questions FOR SELECT
  USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM public.panel_reviewers WHERE user_id = auth.uid() AND is_active = true)
  );

-- =====================================================
-- Seed Data: 5 Universal Competencies
-- =====================================================

INSERT INTO public.interview_kit_competencies (code, name, description, icon, color, display_order, is_active)
VALUES 
  ('solution_design', 'Solution Design & Architecture Thinking', 'Universal ability to frame problems, design solutions, and think structurally.', 'Lightbulb', 'amber', 1, true),
  ('execution_governance', 'Execution & Governance', 'Applies to every domain—delivery discipline, accountability, and decision-making are non-negotiable everywhere.', 'Target', 'blue', 2, true),
  ('data_tech_readiness', 'Data / Tech Readiness & Tooling Awareness', 'The tools may vary by industry, but readiness to use data and technology is universal.', 'Database', 'green', 3, true),
  ('soft_skills', 'Soft Skills for Solution Provider Success', 'Communication, collaboration, leadership, and stakeholder management cut across all domains.', 'Users', 'purple', 4, true),
  ('innovation_cocreation', 'Innovation & Co-creation Ability', 'Every industry now expects solution providers to co-create value, not just execute requirements.', 'Sparkles', 'pink', 5, true);

-- =====================================================
-- Trigger for updated_at
-- =====================================================

CREATE TRIGGER update_interview_kit_competencies_updated_at
  BEFORE UPDATE ON public.interview_kit_competencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_kit_questions_updated_at
  BEFORE UPDATE ON public.interview_kit_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();