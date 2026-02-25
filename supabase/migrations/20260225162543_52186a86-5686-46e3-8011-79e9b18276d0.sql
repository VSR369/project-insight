-- Migration 6: Seed md_tier_features.usage_limit values
-- Tier IDs from DB:
-- basic:    e3338419-144f-4a21-9163-425283cf1862
-- standard: f685fd94-3d03-4dbe-b101-26f17fc4a1a6
-- premium:  41396207-3c6a-4c79-bbf0-91c4bdcab6a2

-- Basic tier limits
UPDATE public.md_tier_features SET usage_limit = 3 
WHERE tier_id = 'e3338419-144f-4a21-9163-425283cf1862' AND feature_code = 'challenges_per_period';

UPDATE public.md_tier_features SET usage_limit = 1 
WHERE tier_id = 'e3338419-144f-4a21-9163-425283cf1862' AND feature_code = 'solutions_per_challenge';

UPDATE public.md_tier_features SET usage_limit = 1 
WHERE tier_id = 'e3338419-144f-4a21-9163-425283cf1862' AND feature_code = 'workflow_templates';

-- Standard tier limits
UPDATE public.md_tier_features SET usage_limit = 15 
WHERE tier_id = 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6' AND feature_code = 'challenges_per_period';

UPDATE public.md_tier_features SET usage_limit = 2 
WHERE tier_id = 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6' AND feature_code = 'solutions_per_challenge';

UPDATE public.md_tier_features SET usage_limit = 3 
WHERE tier_id = 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6' AND feature_code = 'workflow_templates';

-- Premium tier limits
UPDATE public.md_tier_features SET usage_limit = -1 
WHERE tier_id = '41396207-3c6a-4c79-bbf0-91c4bdcab6a2' AND feature_code = 'challenges_per_period';

UPDATE public.md_tier_features SET usage_limit = 3 
WHERE tier_id = '41396207-3c6a-4c79-bbf0-91c4bdcab6a2' AND feature_code = 'solutions_per_challenge';

UPDATE public.md_tier_features SET usage_limit = -1 
WHERE tier_id = '41396207-3c6a-4c79-bbf0-91c4bdcab6a2' AND feature_code = 'workflow_templates';
