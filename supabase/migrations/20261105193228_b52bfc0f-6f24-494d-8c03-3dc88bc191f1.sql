DROP FUNCTION IF EXISTS public.get_business_rule_numbers();
CREATE POLICY authenticated_read_business_rule_numbers ON public.md_mpa_config
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_sensitive, false) = false
    AND param_key IN (
      'return_reason_min_length','hold_reason_min_length','cancel_reason_min_length',
      'screening_commentary_min_length','qa_question_min_length','creator_response_timeout_days',
      'amendment_withdrawal_window_days','amendment_reacceptance_window_days',
      'curator_edit_rewrite_threshold_pct','solution_max_files'
    )
  );