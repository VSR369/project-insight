
-- Function: log_audit — reusable audit trail helper
CREATE OR REPLACE FUNCTION public.log_audit(
  p_challenge_id UUID,
  p_solution_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_method TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_phase_from INTEGER DEFAULT NULL,
  p_phase_to INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_trail (
    challenge_id, solution_id, user_id, action, method, details, phase_from, phase_to, created_by
  ) VALUES (
    p_challenge_id, p_solution_id, p_user_id, p_action, p_method, p_details, p_phase_from, p_phase_to, p_user_id
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- View: recent_activity_view
CREATE OR REPLACE VIEW public.recent_activity_view AS
SELECT
  a.id AS audit_id,
  a.challenge_id,
  c.title AS challenge_title,
  a.solution_id,
  a.user_id,
  COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') AS user_name,
  a.action,
  a.method,
  a.details,
  a.phase_from,
  a.phase_to,
  a.created_at
FROM public.audit_trail a
LEFT JOIN public.challenges c ON a.challenge_id = c.id
LEFT JOIN public.profiles p ON a.user_id = p.id
ORDER BY a.created_at DESC;
