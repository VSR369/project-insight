-- Drop the partial index that PostgREST cannot resolve for onConflict
DROP INDEX IF EXISTS idx_pool_email_unique;

-- Add a proper UNIQUE constraint that PostgREST can use
ALTER TABLE public.platform_provider_pool
  DROP CONSTRAINT IF EXISTS platform_provider_pool_email_key;

ALTER TABLE public.platform_provider_pool
  ADD CONSTRAINT platform_provider_pool_email_key UNIQUE (email);