
-- Extend escrow_records with banking/deposit details for FC workflow
ALTER TABLE public.escrow_records
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS bank_address TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS deposit_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_reference TEXT,
  ADD COLUMN IF NOT EXISTS fc_notes TEXT;
