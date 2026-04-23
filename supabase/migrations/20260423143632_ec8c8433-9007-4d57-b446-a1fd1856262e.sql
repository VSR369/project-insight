ALTER TABLE public.escrow_installments
ADD COLUMN IF NOT EXISTS account_number_raw text;

ALTER TABLE public.escrow_records
ADD COLUMN IF NOT EXISTS account_number_raw text;