ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS complexity_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS complexity_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complexity_locked_by UUID REFERENCES auth.users(id);