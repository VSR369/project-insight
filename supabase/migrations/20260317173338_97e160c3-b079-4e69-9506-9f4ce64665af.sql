ALTER TABLE public.amendment_records
ADD COLUMN IF NOT EXISTS withdrawal_deadline TIMESTAMPTZ;