
-- Create md_departments master data table
CREATE TABLE public.md_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.md_departments ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read for registration flow
CREATE POLICY "Anyone can read active departments"
  ON public.md_departments FOR SELECT
  USING (is_active = true);

-- Seed data
INSERT INTO public.md_departments (code, name, display_order) VALUES
  ('ENG', 'Engineering', 1),
  ('OPS', 'Operations', 2),
  ('FIN', 'Finance & Accounting', 3),
  ('HR', 'Human Resources', 4),
  ('MKT', 'Marketing', 5),
  ('SALES', 'Sales', 6),
  ('IT', 'Information Technology', 7),
  ('LEGAL', 'Legal & Compliance', 8),
  ('RND', 'Research & Development', 9),
  ('PM', 'Product Management', 10),
  ('CS', 'Customer Success', 11),
  ('SCM', 'Supply Chain & Logistics', 12),
  ('ADMIN', 'Administration', 13),
  ('EXEC', 'Executive / Leadership', 14),
  ('DESIGN', 'Design & UX', 15),
  ('QA', 'Quality Assurance', 16),
  ('DATA', 'Data & Analytics', 17),
  ('PROC', 'Procurement', 18),
  ('COMMS', 'Communications & PR', 19),
  ('OTHER', 'Other', 99);

-- Index for common query pattern
CREATE INDEX idx_md_departments_active_order ON public.md_departments (display_order) WHERE is_active = true;
