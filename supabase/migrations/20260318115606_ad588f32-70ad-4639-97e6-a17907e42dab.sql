-- ============================================================
-- LC Review Workflow — Migration 4: md_system_config entry
-- ============================================================

INSERT INTO public.md_system_config (config_key, config_value, description, data_type, is_active)
VALUES (
  'lc_required_challenge_types',
  '[]'::jsonb,
  'JSONB array of governance profile values (e.g., ["ENTERPRISE"]) requiring mandatory Legal Coordinator review. initialize_challenge() forces lc_review_required=true for matching types.',
  'string',
  true
)
ON CONFLICT (config_key) DO NOTHING;
