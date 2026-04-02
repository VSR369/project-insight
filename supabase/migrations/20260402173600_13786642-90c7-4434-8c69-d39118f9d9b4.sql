-- Update Casey Underwood's pool entry: add R5_AGG for all-model coverage
UPDATE public.platform_provider_pool
SET role_codes = ARRAY['R5_MP', 'R5_AGG'],
    domain_scope = '{}'::jsonb,
    updated_at = NOW()
WHERE id = '77d04806-5e10-42e2-83a2-54176707f09c';
