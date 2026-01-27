-- =====================================================
-- Interview Kit: Per-question response storage
-- Stores ratings and comments for each interview question
-- =====================================================

-- Create the interview_question_responses table
CREATE TABLE public.interview_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.interview_evaluations(id) ON DELETE CASCADE,
  question_source TEXT NOT NULL CHECK (question_source IN ('interview_kit', 'question_bank', 'proof_point')),
  question_id UUID, -- FK to interview_kit_questions OR question_bank (nullable for proof points)
  proof_point_id UUID REFERENCES public.proof_points(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL, -- Stored copy for audit trail
  expected_answer TEXT, -- Reference for reviewer
  rating TEXT CHECK (rating IN ('right', 'wrong', 'not_answered')),
  comments TEXT,
  section_name TEXT NOT NULL, -- e.g., 'Domain & Delivery Depth', 'Proof Points Deep-Dive', competency name
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.interview_question_responses ENABLE ROW LEVEL SECURITY;

-- Indexes for query performance
CREATE INDEX idx_interview_responses_evaluation ON public.interview_question_responses(evaluation_id);
CREATE INDEX idx_interview_responses_section ON public.interview_question_responses(evaluation_id, section_name);
CREATE INDEX idx_interview_responses_question ON public.interview_question_responses(question_source, question_id);

-- RLS Policy: Reviewers can manage their own responses
CREATE POLICY "Reviewers manage own responses" ON public.interview_question_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.interview_evaluations ie
      JOIN public.panel_reviewers pr ON ie.reviewer_id = pr.id
      WHERE ie.id = interview_question_responses.evaluation_id
      AND pr.user_id = auth.uid()
      AND pr.is_active = true
    )
  );

-- RLS Policy: Admins can manage all responses
CREATE POLICY "Admins manage all responses" ON public.interview_question_responses
  FOR ALL USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_interview_question_responses_updated_at
  BEFORE UPDATE ON public.interview_question_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();