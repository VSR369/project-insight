CREATE TABLE IF NOT EXISTS public.md_ip_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.md_ip_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active IP models"
  ON public.md_ip_models FOR SELECT TO authenticated
  USING (is_active = true);

INSERT INTO public.md_ip_models (code, label, description, display_order) VALUES
  ('IP-EA', 'Exclusive Assignment', 'All intellectual property transfers to the challenge seeker', 1),
  ('IP-NEL', 'Non-Exclusive License', 'Solver retains ownership, grants license to seeker', 2),
  ('IP-EL', 'Exclusive License', 'Solver grants exclusive license to seeker', 3),
  ('IP-JO', 'Joint Ownership', 'Joint ownership between solver and seeker', 4),
  ('IP-NONE', 'No IP Transfer', 'Solver retains full IP ownership', 5);