
-- Master data table for availability statuses (removes hardcoded values from UI)
CREATE TABLE public.md_availability_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color_class TEXT,
  display_order INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_md_availability_statuses_active ON public.md_availability_statuses(is_active, display_order);

ALTER TABLE public.md_availability_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active availability statuses"
  ON public.md_availability_statuses
  FOR SELECT
  USING (is_active = true);

INSERT INTO public.md_availability_statuses (code, display_name, color_class, display_order) VALUES
  ('available', 'Available', 'emerald', 1),
  ('partially_available', 'Partially Available', 'amber', 2),
  ('fully_booked', 'Fully Booked', 'red', 3);
