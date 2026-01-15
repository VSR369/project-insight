-- Update all master data tables to allow admins to see inactive records

-- Countries
DROP POLICY IF EXISTS "Public read countries" ON countries;
CREATE POLICY "Public and admin read countries" ON countries
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Industry Segments
DROP POLICY IF EXISTS "Public read industry_segments" ON industry_segments;
CREATE POLICY "Public and admin read industry_segments" ON industry_segments
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Organization Types
DROP POLICY IF EXISTS "Public read organization_types" ON organization_types;
CREATE POLICY "Public and admin read organization_types" ON organization_types
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Participation Modes
DROP POLICY IF EXISTS "Public read participation_modes" ON participation_modes;
CREATE POLICY "Public and admin read participation_modes" ON participation_modes
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Expertise Levels
DROP POLICY IF EXISTS "Public read expertise_levels" ON expertise_levels;
CREATE POLICY "Public and admin read expertise_levels" ON expertise_levels
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Academic Disciplines
DROP POLICY IF EXISTS "Public read academic_disciplines" ON academic_disciplines;
CREATE POLICY "Public and admin read academic_disciplines" ON academic_disciplines
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Academic Streams
DROP POLICY IF EXISTS "Public read academic_streams" ON academic_streams;
CREATE POLICY "Public and admin read academic_streams" ON academic_streams
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Academic Subjects
DROP POLICY IF EXISTS "Public read academic_subjects" ON academic_subjects;
CREATE POLICY "Public and admin read academic_subjects" ON academic_subjects
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Proficiency Areas
DROP POLICY IF EXISTS "Public read proficiency_areas" ON proficiency_areas;
CREATE POLICY "Public and admin read proficiency_areas" ON proficiency_areas
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Sub Domains
DROP POLICY IF EXISTS "Public read sub_domains" ON sub_domains;
CREATE POLICY "Public and admin read sub_domains" ON sub_domains
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Specialities
DROP POLICY IF EXISTS "Public read specialities" ON specialities;
CREATE POLICY "Public and admin read specialities" ON specialities
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));

-- Question Bank
DROP POLICY IF EXISTS "Authenticated read questions" ON question_bank;
CREATE POLICY "Authenticated and admin read questions" ON question_bank
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));