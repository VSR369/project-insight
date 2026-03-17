
-- ══════════════════════════════════════════════════════════════
-- challenge_qa table — Q&A data model for CogniBlend challenges
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.challenge_qa (
  qa_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL REFERENCES auth.users(id),
  question_text TEXT NOT NULL,
  anonymous_id TEXT,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_qa_challenge_published
  ON public.challenge_qa(challenge_id, is_published);

CREATE INDEX IF NOT EXISTS idx_challenge_qa_asked_by
  ON public.challenge_qa(asked_by);

-- RLS
ALTER TABLE public.challenge_qa ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published Q&A for challenges they have access to
CREATE POLICY "Users can read published qa"
  ON public.challenge_qa FOR SELECT TO authenticated
  USING (is_published = true);

-- Users can read their own unpublished questions
CREATE POLICY "Users can read own questions"
  ON public.challenge_qa FOR SELECT TO authenticated
  USING (asked_by = auth.uid());

-- Authenticated users can insert questions
CREATE POLICY "Users can insert questions"
  ON public.challenge_qa FOR INSERT TO authenticated
  WITH CHECK (asked_by = auth.uid());

-- Challenge team can update (answer/publish) — uses user_challenge_roles
CREATE POLICY "Challenge team can update qa"
  ON public.challenge_qa FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = challenge_qa.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.is_active = true
        AND ucr.role_code IN ('CU', 'CR', 'ID', 'AM')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- submit_question function
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.submit_question(
  p_challenge_id UUID,
  p_user_id UUID,
  p_question_text TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qa_id UUID;
  v_anon_id TEXT;
  v_solver_index INT;
  v_challenge_title TEXT;
  v_operating_model TEXT;
  v_target_role TEXT;
BEGIN
  -- Determine anonymous ID based on distinct askers for this challenge
  SELECT COUNT(*) + 1 INTO v_solver_index
  FROM (
    SELECT DISTINCT asked_by
    FROM public.challenge_qa
    WHERE challenge_id = p_challenge_id
      AND asked_by != p_user_id
  ) sub;

  -- Check if user already has an anonymous_id for this challenge
  SELECT anonymous_id INTO v_anon_id
  FROM public.challenge_qa
  WHERE challenge_id = p_challenge_id
    AND asked_by = p_user_id
  LIMIT 1;

  -- Assign new anonymous_id if none exists
  IF v_anon_id IS NULL THEN
    v_anon_id := 'Solver-' || chr(64 + v_solver_index); -- A=65, so 64+1=A
  END IF;

  -- Insert the question
  INSERT INTO public.challenge_qa (
    challenge_id, asked_by, question_text, anonymous_id, created_by
  ) VALUES (
    p_challenge_id, p_user_id, p_question_text, v_anon_id, p_user_id
  ) RETURNING qa_id INTO v_qa_id;

  -- Get challenge info for notification routing
  SELECT title, operating_model
  INTO v_challenge_title, v_operating_model
  FROM public.challenges
  WHERE id = p_challenge_id;

  -- Route notification: CU for MP, CR for AGG/Lightweight
  IF v_operating_model = 'MP' THEN
    v_target_role := 'CU';
  ELSE
    v_target_role := 'CR';
  END IF;

  -- Send notification to the appropriate role holder(s)
  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message)
  SELECT
    ucr.user_id,
    p_challenge_id,
    'QA_QUESTION_SUBMITTED',
    'New Q&A Question',
    'A new question has been submitted for "' || COALESCE(v_challenge_title, 'Unknown') || '" by ' || v_anon_id || '.'
  FROM public.user_challenge_roles ucr
  WHERE ucr.challenge_id = p_challenge_id
    AND ucr.role_code = v_target_role
    AND ucr.is_active = true;

  -- Audit trail
  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id,
    p_challenge_id,
    'QA_QUESTION_SUBMITTED',
    'USER',
    jsonb_build_object(
      'qa_id', v_qa_id,
      'anonymous_id', v_anon_id,
      'question_preview', left(p_question_text, 100)
    )
  );

  RETURN v_qa_id;
END;
$$;
