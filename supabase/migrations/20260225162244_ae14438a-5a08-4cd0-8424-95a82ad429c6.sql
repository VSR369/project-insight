-- Migration 2: Create md_company_sizes table + seed data
CREATE TABLE IF NOT EXISTS public.md_company_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_range TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.md_company_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "md_company_sizes_read_all" ON public.md_company_sizes
  FOR SELECT USING (true);

INSERT INTO public.md_company_sizes (size_range, display_order) VALUES
  ('1-10', 1),
  ('11-50', 2),
  ('51-200', 3),
  ('201-1000', 4),
  ('1001-5000', 5),
  ('5001+', 6)
ON CONFLICT (size_range) DO NOTHING;
