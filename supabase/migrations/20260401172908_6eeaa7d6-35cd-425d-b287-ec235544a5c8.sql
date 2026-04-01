ALTER TABLE public.ai_review_global_config
ADD COLUMN IF NOT EXISTS use_context_intelligence BOOLEAN NOT NULL DEFAULT false;