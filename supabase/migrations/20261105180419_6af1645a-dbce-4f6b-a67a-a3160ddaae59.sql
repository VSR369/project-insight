INSERT INTO public.md_mpa_config (param_key, param_value, param_type, param_group, label, unit, min_value, max_value, description, is_critical, requires_restart, is_sensitive)
VALUES
 ('return_reason_min_length','10','INTEGER','GOVERNANCE_RULES','Return reason minimum length','characters','1','500','Minimum characters for a reason when returning work to the Curator (Curator, Legal, Finance).',false,false,false),
 ('hold_reason_min_length','50','INTEGER','GOVERNANCE_RULES','Hold reason minimum length','characters','1','1000','Minimum characters required to put a challenge on hold.',false,false,false),
 ('cancel_reason_min_length','100','INTEGER','GOVERNANCE_RULES','Cancel reason minimum length','characters','1','2000','Minimum characters required to cancel a challenge.',false,false,false),
 ('screening_commentary_min_length','100','INTEGER','EVALUATION','Screening commentary minimum length','characters','0','2000','Minimum reviewer commentary when scoring an abstract in Structured/Controlled challenges.',false,false,false),
 ('qa_question_min_length','20','INTEGER','EVALUATION','Q&A question minimum length','characters','1','500','Minimum characters for a Solution Provider question in challenge Q&A.',false,false,false),
 ('creator_response_timeout_days','7','INTEGER','CHALLENGE_TIMING','Creator response timeout','days','1','60','Days the Creator has to respond to curation or legal review before it is overdue.',false,false,false),
 ('amendment_withdrawal_window_days','7','INTEGER','CHALLENGE_TIMING','Amendment withdrawal window','days','1','60','Days Solution Providers may withdraw after a material amendment.',false,false,false),
 ('amendment_reacceptance_window_days','7','INTEGER','CHALLENGE_TIMING','Amendment re-acceptance window','days','1','60','Days Solution Providers have to re-accept terms after an amendment.',false,false,false),
 ('curator_edit_rewrite_threshold_pct','15','INTEGER','EVALUATION','Curator rewrite threshold','percent','1','100','Edit distance at or above which a curator change counts as a rewrite rather than a minor edit.',false,false,false)
ON CONFLICT (param_key) DO NOTHING;