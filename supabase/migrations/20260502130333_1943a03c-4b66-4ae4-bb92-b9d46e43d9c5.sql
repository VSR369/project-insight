-- Repair any existing rows holding the legacy 'LIGHTWEIGHT' (or other invalid) value
UPDATE public.seeker_organizations
SET governance_profile = 'QUICK'
WHERE governance_profile NOT IN ('QUICK','STRUCTURED','CONTROLLED');

-- Align the column default with the canonical CHECK constraint
ALTER TABLE public.seeker_organizations
  ALTER COLUMN governance_profile SET DEFAULT 'QUICK';