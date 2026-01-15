-- Add DELETE RLS policies for platform_admin on all master data tables

-- Countries
CREATE POLICY "Admin delete countries" ON public.countries
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Expertise Levels
CREATE POLICY "Admin delete expertise_levels" ON public.expertise_levels
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Industry Segments
CREATE POLICY "Admin delete industry_segments" ON public.industry_segments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Organization Types
CREATE POLICY "Admin delete organization_types" ON public.organization_types
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Participation Modes
CREATE POLICY "Admin delete participation_modes" ON public.participation_modes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Question Bank
CREATE POLICY "Admin delete question_bank" ON public.question_bank
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Academic Disciplines
CREATE POLICY "Admin delete academic_disciplines" ON public.academic_disciplines
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Academic Streams
CREATE POLICY "Admin delete academic_streams" ON public.academic_streams
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Academic Subjects
CREATE POLICY "Admin delete academic_subjects" ON public.academic_subjects
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Proficiency Areas
CREATE POLICY "Admin delete proficiency_areas" ON public.proficiency_areas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Sub Domains
CREATE POLICY "Admin delete sub_domains" ON public.sub_domains
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Specialities
CREATE POLICY "Admin delete specialities" ON public.specialities
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));