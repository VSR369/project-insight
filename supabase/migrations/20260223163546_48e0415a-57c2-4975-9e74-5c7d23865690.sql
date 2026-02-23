-- Fix: Premium tier should NOT be enterprise (it's a regular selectable tier)
UPDATE public.md_subscription_tiers 
SET is_enterprise = false 
WHERE code = 'premium';