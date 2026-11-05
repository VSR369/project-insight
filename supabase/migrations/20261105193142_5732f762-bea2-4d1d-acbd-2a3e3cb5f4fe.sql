CREATE OR REPLACE FUNCTION public.get_business_rule_numbers()
RETURNS TABLE(param_key text, param_value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.param_key::text, c.param_value::text
  FROM public.md_mpa_config c
  WHERE auth.uid() IS NOT NULL
    AND COALESCE(c.is_sensitive, false) = false
    AND c.param_key IN (
      'return_reason_min_length','hold_reason_min_length','cancel_reason_min_length',
      'screening_commentary_min_length','qa_question_min_length','creator_response_timeout_days',
      'amendment_withdrawal_window_days','amendment_reacceptance_window_days',
      'curator_edit_rewrite_threshold_pct','solution_max_files'
    );
$$;
REVOKE ALL ON FUNCTION public.get_business_rule_numbers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_rule_numbers() TO authenticated;