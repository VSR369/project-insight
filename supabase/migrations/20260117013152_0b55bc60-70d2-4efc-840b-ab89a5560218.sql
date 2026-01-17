-- =====================================================
-- Phase 1.1: Add Audit Fields to Master Data Tables
-- Add created_by and updated_by columns for compliance
-- =====================================================

-- Countries
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Industry Segments
ALTER TABLE public.industry_segments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Expertise Levels
ALTER TABLE public.expertise_levels
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Participation Modes
ALTER TABLE public.participation_modes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Organization Types
ALTER TABLE public.organization_types
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Proficiency Areas
ALTER TABLE public.proficiency_areas
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Sub Domains
ALTER TABLE public.sub_domains
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Specialities
ALTER TABLE public.specialities
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Academic Disciplines
ALTER TABLE public.academic_disciplines
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Academic Streams
ALTER TABLE public.academic_streams
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Academic Subjects
ALTER TABLE public.academic_subjects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Capability Tags
ALTER TABLE public.capability_tags
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Level Speciality Map
ALTER TABLE public.level_speciality_map
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- =====================================================
-- Phase 1.2: Add Performance Indexes
-- Composite indexes for common query patterns
-- =====================================================

-- Provider queries - lifecycle filtering
CREATE INDEX IF NOT EXISTS idx_providers_lifecycle 
  ON public.solution_providers(lifecycle_status, lifecycle_rank);

-- Provider queries - segment filtering  
CREATE INDEX IF NOT EXISTS idx_providers_segment 
  ON public.solution_providers(industry_segment_id) 
  WHERE industry_segment_id IS NOT NULL;

-- Provider queries - expertise filtering
CREATE INDEX IF NOT EXISTS idx_providers_expertise 
  ON public.solution_providers(expertise_level_id) 
  WHERE expertise_level_id IS NOT NULL;

-- Proficiency Areas - segment + level lookup
CREATE INDEX IF NOT EXISTS idx_prof_areas_segment_level 
  ON public.proficiency_areas(industry_segment_id, expertise_level_id, is_active);

-- Sub Domains - area lookup
CREATE INDEX IF NOT EXISTS idx_subdomains_area 
  ON public.sub_domains(proficiency_area_id, is_active);

-- Specialities - subdomain lookup
CREATE INDEX IF NOT EXISTS idx_specialities_subdomain 
  ON public.specialities(sub_domain_id, is_active);

-- Proof Points - provider queries
CREATE INDEX IF NOT EXISTS idx_proof_points_provider_active 
  ON public.proof_points(provider_id, is_deleted, category);

-- Question Bank - speciality + type queries
CREATE INDEX IF NOT EXISTS idx_questions_speciality_type 
  ON public.question_bank(speciality_id, is_active, question_type);

-- Question Bank - difficulty filtering
CREATE INDEX IF NOT EXISTS idx_questions_difficulty 
  ON public.question_bank(difficulty, is_active);

-- Provider Proficiency Areas - provider lookup
CREATE INDEX IF NOT EXISTS idx_provider_prof_areas 
  ON public.provider_proficiency_areas(provider_id);

-- Provider Specialities - provider lookup  
CREATE INDEX IF NOT EXISTS idx_provider_specialities
  ON public.provider_specialities(provider_id);

-- Level Speciality Map - level lookup
CREATE INDEX IF NOT EXISTS idx_level_spec_map_level 
  ON public.level_speciality_map(expertise_level_id);

-- Academic hierarchy indexes
CREATE INDEX IF NOT EXISTS idx_academic_streams_discipline 
  ON public.academic_streams(discipline_id, is_active);

CREATE INDEX IF NOT EXISTS idx_academic_subjects_stream 
  ON public.academic_subjects(stream_id, is_active);