-- Fix 1: Remove Enterprise tier pricing rows (Enterprise pricing is negotiated, not a rate card)
DELETE FROM public.md_tier_country_pricing 
WHERE tier_id = '7bf7f040-5d05-4c75-b26c-182cb4113c62';