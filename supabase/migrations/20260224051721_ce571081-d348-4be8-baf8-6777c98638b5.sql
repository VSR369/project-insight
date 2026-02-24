ALTER TABLE public.md_membership_tiers
  ADD COLUMN IF NOT EXISTS annual_fee_usd NUMERIC(10,2);

UPDATE public.md_membership_tiers SET annual_fee_usd = 500.00 WHERE code = 'annual';
UPDATE public.md_membership_tiers SET annual_fee_usd = 900.00 WHERE code = 'multi_year';

NOTIFY pgrst, 'reload schema';