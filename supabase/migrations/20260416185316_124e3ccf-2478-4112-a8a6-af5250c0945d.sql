-- Backfill default analyst_sources for AI review section configs that lack grounding sources.
-- This ensures Pass 1 (Analyse) has explicit evidence_source attribution per the Principal-grade methodology.

UPDATE public.ai_review_section_config
SET 
  analyst_sources = '[
    {"name": "Industry Pack", "relevance": "Sector-specific best practices and benchmarks"},
    {"name": "Geography Pack", "relevance": "Regional regulatory and market context"},
    {"name": "Context Digest", "relevance": "Synthesized challenge-specific verified context"}
  ]'::jsonb,
  updated_at = NOW()
WHERE is_active = true
  AND (analyst_sources IS NULL OR analyst_sources = '[]'::jsonb OR jsonb_array_length(analyst_sources) = 0);