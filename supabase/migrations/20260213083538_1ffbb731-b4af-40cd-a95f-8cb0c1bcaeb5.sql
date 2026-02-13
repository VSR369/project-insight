
-- Add department_id column to md_functional_areas
ALTER TABLE md_functional_areas 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES md_departments(id);

-- Index for department lookups
CREATE INDEX IF NOT EXISTS idx_functional_areas_department ON md_functional_areas(department_id);

-- Admin write policies on md_departments (currently only has SELECT)
CREATE POLICY "Admin full access md_departments"
  ON md_departments FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Seed linkages between existing functional areas and departments
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'IT') WHERE code = 'TECH';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'OPS') WHERE code = 'OPS';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'FIN') WHERE code = 'FIN';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'MKT') WHERE code = 'MKT';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'HR') WHERE code = 'HR';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'LEGAL') WHERE code = 'LEGAL';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'RND') WHERE code = 'RND';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'SCM') WHERE code = 'SCM';
UPDATE md_functional_areas SET department_id = (SELECT id FROM md_departments WHERE code = 'SALES') WHERE code = 'SALES';
