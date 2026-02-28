
ALTER TABLE public.seeker_billing_info
  ADD COLUMN IF NOT EXISTS billing_verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (billing_verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_received_date DATE,
  ADD COLUMN IF NOT EXISTS billing_verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS billing_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_verified_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_seeker_billing_info_verification_status
  ON public.seeker_billing_info(billing_verification_status);
