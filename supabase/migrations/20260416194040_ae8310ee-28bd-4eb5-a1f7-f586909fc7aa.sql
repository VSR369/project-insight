ALTER TABLE public.challenge_quality_telemetry
  ADD COLUMN IF NOT EXISTS principal_compliance_pct INTEGER;

COMMENT ON COLUMN public.challenge_quality_telemetry.principal_compliance_pct IS
  'Percentage (0-100) of substantive Pass 1 comments (error/warning/suggestion) meeting principal-grade bar (≥2 of 4 forcing fields: quantification, framework_applied, evidence_source≠general_knowledge, cross_reference_verified). NULL = no substantive comments in this run.';