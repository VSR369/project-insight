-- Add user_id column to platform_provider_pool for linking pool members to auth users
ALTER TABLE platform_provider_pool
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill existing pool members by email match
UPDATE platform_provider_pool p
SET user_id = u.id
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND p.user_id IS NULL;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_pool_user_id ON platform_provider_pool(user_id);