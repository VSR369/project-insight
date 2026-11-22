DROP POLICY IF EXISTS authenticated_read_lifecycle_timing_rules ON public.md_mpa_config;
DROP POLICY IF EXISTS authenticated_read_business_rule_numbers ON public.md_mpa_config;
CREATE POLICY authenticated_read_business_rule_numbers ON public.md_mpa_config
FOR SELECT TO authenticated
USING (
  COALESCE(is_sensitive,false)=false
  AND param_key = ANY (ARRAY[
    'return_reason_min_length','hold_reason_min_length','cancel_reason_min_length',
    'screening_commentary_min_length','qa_question_min_length','creator_response_timeout_days',
    'amendment_withdrawal_window_days','amendment_reacceptance_window_days',
    'curator_edit_rewrite_threshold_pct','solution_max_files',
    'solution_approach_summary_min_chars','abstract_min_chars',
    'challenge_min_open_period_days','abstract_min_open_period_days',
    'solution_min_open_period_days','deadline_max_extension_days',
    'deadline_max_extensions_per_deadline','deadline_extension_reason_min_length'
  ])
);