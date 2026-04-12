ALTER TABLE public.ai_review_global_config
  ADD COLUMN IF NOT EXISTS fallback_model TEXT DEFAULT 'openai/gpt-5-mini';