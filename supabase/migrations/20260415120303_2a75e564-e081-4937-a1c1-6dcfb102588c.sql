
-- 1. Enable context intelligence + set critical model
UPDATE public.ai_review_global_config
SET use_context_intelligence = true,
    critical_model = 'google/gemini-3-flash-preview',
    updated_at = now()
WHERE id = 1;

-- 2. Delete deprecated config rows
DELETE FROM public.ai_review_section_config
WHERE role_context = 'curation'
  AND section_key IN ('challenge_visibility', 'effort_level', 'submission_deadline');

-- 3. Insert 6 missing section configs
INSERT INTO public.ai_review_section_config (
  role_context, section_key, section_label, importance_level,
  section_description, review_instructions, dos, donts, tone,
  min_words, max_words, required_elements, wave_number, tab_group, is_active, version
) VALUES
(
  'curation', 'organization_context', 'Organization Context', 'High',
  'Organization profile completeness and accuracy for solver context',
  'Review the organization profile for completeness and relevance. Verify that the description clearly conveys what the organization does, its industry, scale, and operating context. Ensure the website is provided and appears legitimate. Check that the industry segment aligns with the challenge domain. Flag any missing or vague information that would leave solvers unable to understand who they are working for.',
  'Verify org description is specific and informative. Check website URL is present. Confirm industry segment matches challenge domain. Ensure operating model context is clear.',
  'Do not accept single-sentence descriptions. Do not skip website verification. Do not ignore mismatches between stated industry and challenge domain.',
  'Formal',
  50, 200, ARRAY['org_description', 'industry_alignment', 'website_presence'],
  1, 'organization', true, 1
),
(
  'curation', 'creator_references', 'Creator Reference Documents', 'Medium',
  'Uploaded reference documents from the challenge creator',
  'Review all uploaded reference documents for relevance to the challenge scope. Verify that documents are accessible and not corrupted. Check that document descriptions accurately reflect content. Flag any documents that appear irrelevant, outdated, or potentially containing sensitive information that should not be shared with solvers. Ensure the shared_with_solver flag is appropriately set.',
  'Verify each attachment has a clear description. Check file types are appropriate. Confirm relevance to challenge scope. Flag sensitive content.',
  'Do not skip document review. Do not assume all attachments are relevant. Do not ignore missing descriptions.',
  'Balanced',
  30, 150, ARRAY['attachment_relevance', 'description_quality', 'access_verification'],
  3, 'specification', true, 1
),
(
  'curation', 'reference_urls', 'Reference URLs', 'Medium',
  'External reference URLs provided by the challenge creator',
  'Review all provided reference URLs for relevance and accessibility. Check that URLs are not broken, paywalled, or region-restricted. Verify that URL descriptions accurately represent the linked content. Flag any URLs that appear irrelevant to the challenge scope or that might become unavailable. Ensure URLs complement rather than duplicate uploaded reference documents.',
  'Verify URL accessibility. Check descriptions match linked content. Confirm relevance to challenge scope. Flag paywalled or restricted content.',
  'Do not accept URLs without descriptions. Do not skip accessibility checks. Do not ignore duplicate references across URLs and documents.',
  'Balanced',
  30, 150, ARRAY['url_accessibility', 'description_accuracy', 'relevance_check'],
  3, 'specification', true, 1
),
(
  'curation', 'evaluation_config', 'Evaluation Configuration', 'High',
  'Evaluation method configuration (SINGLE expert vs DELPHI panel)',
  'Review the evaluation configuration for alignment with challenge complexity and eligibility model. SINGLE evaluation is appropriate for straightforward challenges with clear criteria. DELPHI (panel) evaluation should be used for complex, multi-disciplinary challenges or when bias reduction is critical. Verify that evaluator_count aligns with the chosen method. For DELPHI, ensure 3-5 evaluators are specified. Flag any misalignment between evaluation method and challenge complexity.',
  'Verify evaluation method matches complexity level. Check evaluator count is appropriate. Confirm alignment with eligibility model. Suggest DELPHI for complex challenges.',
  'Do not accept SINGLE evaluation for CONTROLLED governance challenges. Do not allow evaluator_count of 0. Do not ignore complexity-evaluation mismatches.',
  'Formal',
  40, 180, ARRAY['method_complexity_alignment', 'evaluator_count_validation', 'governance_consistency'],
  6, 'presentation', true, 1
),
(
  'curation', 'solver_audience', 'Solver Audience', 'Medium',
  'Target solver audience segmentation (Internal/External/All)',
  'Review the solver audience setting for alignment with the organization operating model and challenge visibility. INTERNAL audience should only be used when the organization has an established internal solver network. EXTERNAL is standard for open innovation. ALL combines both pools. Verify consistency with the challenge visibility setting and eligibility requirements. Flag contradictions such as INTERNAL audience with PUBLIC visibility.',
  'Verify audience aligns with operating model. Check consistency with visibility setting. Confirm eligibility requirements match audience scope.',
  'Do not accept INTERNAL audience without verifying org has internal solvers. Do not ignore audience-visibility contradictions. Do not skip operating model verification.',
  'Balanced',
  30, 120, ARRAY['audience_model_alignment', 'visibility_consistency'],
  6, 'presentation', true, 1
),
(
  'curation', 'creator_legal_instructions', 'Creator Legal Instructions', 'High',
  'Legal instructions and requirements specified by the challenge creator',
  'Review the creator legal instructions for clarity, completeness, and alignment with the selected IP model. Ensure instructions are specific enough for solvers to understand their obligations. Verify consistency with the IP model selection and any attached legal documents. Flag vague or contradictory instructions. Check that instructions do not conflict with platform standard terms. Ensure instructions address data handling, confidentiality, and IP assignment as appropriate for the challenge type.',
  'Verify alignment with IP model. Check clarity and specificity. Confirm consistency with legal documents. Ensure data handling instructions are present for data-intensive challenges.',
  'Do not accept vague legal instructions for CONTROLLED governance. Do not ignore IP model contradictions. Do not skip confidentiality requirement verification.',
  'Formal',
  50, 200, ARRAY['ip_model_alignment', 'instruction_clarity', 'legal_doc_consistency'],
  6, 'presentation', true, 1
);
