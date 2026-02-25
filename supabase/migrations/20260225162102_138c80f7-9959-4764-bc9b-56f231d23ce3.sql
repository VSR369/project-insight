-- Migration 1: Create md_org_types table + seed data
CREATE TABLE IF NOT EXISTS public.md_org_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.md_org_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "md_org_types_read_all" ON public.md_org_types
  FOR SELECT USING (true);

INSERT INTO public.md_org_types (name, code, description, display_order) VALUES
  ('Corporation', 'corporation', 'A legal entity separate from its owners', 1),
  ('Partnership', 'partnership', 'Business owned by two or more partners', 2),
  ('LLC', 'llc', 'Limited Liability Company', 3),
  ('Sole Proprietorship', 'sole_proprietorship', 'Business owned by a single individual', 4),
  ('Non-Profit', 'non_profit', 'Organization operating for charitable or social purposes', 5),
  ('Government', 'government', 'Government agency or department', 6),
  ('Educational Institution', 'educational_institution', 'University, college, or educational body', 7),
  ('Startup', 'startup', 'Early-stage or growth-stage company', 8)
ON CONFLICT (code) DO NOTHING;
