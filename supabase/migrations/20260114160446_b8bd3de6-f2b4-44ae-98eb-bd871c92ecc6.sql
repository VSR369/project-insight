-- =============================================
-- PHASE 1: DATABASE FOUNDATION (FIXED ORDER)
-- Solution Provider Enrollment Platform
-- =============================================

-- =============================================
-- 1. MASTER DATA TABLES FIRST
-- =============================================

-- Countries (ISO-3166)
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone_code VARCHAR(10),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Industry Segments
CREATE TABLE public.industry_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Expertise Levels (4 levels)
CREATE TABLE public.expertise_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE CHECK (level_number BETWEEN 1 AND 4),
  name VARCHAR(50) NOT NULL,
  min_years INTEGER NOT NULL,
  max_years INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Participation Modes
CREATE TABLE public.participation_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_org_info BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Organization Types
CREATE TABLE public.organization_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Academic Disciplines
CREATE TABLE public.academic_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Academic Streams
CREATE TABLE public.academic_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id UUID NOT NULL REFERENCES public.academic_disciplines(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Academic Subjects
CREATE TABLE public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.academic_streams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Proficiency Areas (Top-level taxonomy)
CREATE TABLE public.proficiency_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_segment_id UUID NOT NULL REFERENCES public.industry_segments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Sub-Domains (Mid-level taxonomy)
CREATE TABLE public.sub_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proficiency_area_id UUID NOT NULL REFERENCES public.proficiency_areas(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Specialities (Leaf-level skills)
CREATE TABLE public.specialities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_domain_id UUID NOT NULL REFERENCES public.sub_domains(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Level-Speciality Mapping (eligibility by level)
CREATE TABLE public.level_speciality_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expertise_level_id UUID NOT NULL REFERENCES public.expertise_levels(id) ON DELETE CASCADE,
  speciality_id UUID NOT NULL REFERENCES public.specialities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(expertise_level_id, speciality_id)
);

-- =============================================
-- 2. ENUM TYPES
-- =============================================

CREATE TYPE public.app_role AS ENUM (
  'platform_admin',
  'tenant_admin', 
  'solution_provider',
  'seeker'
);

CREATE TYPE public.lifecycle_status AS ENUM (
  'invited',
  'registered',
  'profile_building',
  'assessment_pending',
  'assessment_completed',
  'verified',
  'active',
  'suspended',
  'inactive'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'in_progress',
  'verified',
  'rejected'
);

CREATE TYPE public.onboarding_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TYPE public.proof_point_type AS ENUM (
  'project',
  'case_study',
  'certification',
  'award',
  'publication',
  'portfolio',
  'testimonial',
  'other'
);

CREATE TYPE public.proof_point_category AS ENUM (
  'general',
  'specialty_specific'
);

CREATE TYPE public.invitation_type AS ENUM (
  'standard',
  'vip_expert'
);

-- =============================================
-- 3. CORE BUSINESS TABLES
-- =============================================

-- User Roles (separate table for security) - CREATED BEFORE has_role function
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, role, tenant_id)
);

-- Profiles (extended user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Solution Providers
CREATE TABLE public.solution_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  address TEXT,
  pin_code VARCHAR(10),
  country_id UUID REFERENCES public.countries(id),
  industry_segment_id UUID REFERENCES public.industry_segments(id),
  expertise_level_id UUID REFERENCES public.expertise_levels(id),
  participation_mode_id UUID REFERENCES public.participation_modes(id),
  lifecycle_status public.lifecycle_status NOT NULL DEFAULT 'registered',
  onboarding_status public.onboarding_status NOT NULL DEFAULT 'not_started',
  verification_status public.verification_status DEFAULT 'pending',
  profile_completion_percentage INTEGER DEFAULT 0,
  is_student BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

-- Student Profiles (extension for students)
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  institution VARCHAR(200),
  graduation_year INTEGER,
  discipline_id UUID REFERENCES public.academic_disciplines(id),
  stream_id UUID REFERENCES public.academic_streams(id),
  subject_id UUID REFERENCES public.academic_subjects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Solution Provider Organizations (for ORG_REP mode)
CREATE TABLE public.solution_provider_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  org_name VARCHAR(200) NOT NULL,
  org_type_id UUID REFERENCES public.organization_types(id),
  org_website VARCHAR(255),
  designation VARCHAR(100),
  manager_name VARCHAR(100),
  manager_email VARCHAR(255),
  manager_phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Provider Selected Specialities
CREATE TABLE public.provider_specialities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  speciality_id UUID NOT NULL REFERENCES public.specialities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, speciality_id)
);

-- Proof Points (Evidence Portfolio)
CREATE TABLE public.proof_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  type public.proof_point_type NOT NULL,
  category public.proof_point_category NOT NULL DEFAULT 'general',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);

-- Proof Point Links
CREATE TABLE public.proof_point_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_point_id UUID NOT NULL REFERENCES public.proof_points(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title VARCHAR(200),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proof Point Files
CREATE TABLE public.proof_point_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_point_id UUID NOT NULL REFERENCES public.proof_points(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proof Point Speciality Tags
CREATE TABLE public.proof_point_speciality_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_point_id UUID NOT NULL REFERENCES public.proof_points(id) ON DELETE CASCADE,
  speciality_id UUID NOT NULL REFERENCES public.specialities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proof_point_id, speciality_id)
);

-- Solution Provider Invitations
CREATE TABLE public.solution_provider_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  invitation_type public.invitation_type NOT NULL DEFAULT 'standard',
  industry_segment_id UUID REFERENCES public.industry_segments(id),
  message TEXT,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Question Bank
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speciality_id UUID NOT NULL REFERENCES public.specialities(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3),
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID
);

-- Assessment Attempts
CREATE TABLE public.assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  total_questions INTEGER NOT NULL,
  answered_questions INTEGER DEFAULT 0,
  score_percentage NUMERIC(5,2),
  is_passed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment Attempt Responses
CREATE TABLE public.assessment_attempt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id),
  selected_option INTEGER CHECK (selected_option BETWEEN 0 AND 3),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment Results Rollup (by proficiency area)
CREATE TABLE public.assessment_results_rollup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  proficiency_area_id UUID NOT NULL REFERENCES public.proficiency_areas(id),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. SECURITY DEFINER FUNCTION (after user_roles exists)
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- 5. INDEXES
-- =============================================

-- Master data indexes
CREATE INDEX idx_countries_code ON public.countries(code);
CREATE INDEX idx_countries_active ON public.countries(is_active);
CREATE INDEX idx_industry_segments_code ON public.industry_segments(code);
CREATE INDEX idx_industry_segments_active ON public.industry_segments(is_active);
CREATE INDEX idx_expertise_levels_number ON public.expertise_levels(level_number);
CREATE INDEX idx_participation_modes_code ON public.participation_modes(code);
CREATE INDEX idx_organization_types_code ON public.organization_types(code);

-- Taxonomy indexes
CREATE INDEX idx_proficiency_areas_segment ON public.proficiency_areas(industry_segment_id);
CREATE INDEX idx_sub_domains_area ON public.sub_domains(proficiency_area_id);
CREATE INDEX idx_specialities_subdomain ON public.specialities(sub_domain_id);
CREATE INDEX idx_level_speciality_map_level ON public.level_speciality_map(expertise_level_id);
CREATE INDEX idx_level_speciality_map_speciality ON public.level_speciality_map(speciality_id);

-- Academic indexes
CREATE INDEX idx_academic_streams_discipline ON public.academic_streams(discipline_id);
CREATE INDEX idx_academic_subjects_stream ON public.academic_subjects(stream_id);

-- Business table indexes
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_solution_providers_user ON public.solution_providers(user_id);
CREATE INDEX idx_solution_providers_status ON public.solution_providers(lifecycle_status);
CREATE INDEX idx_solution_providers_country ON public.solution_providers(country_id);
CREATE INDEX idx_solution_providers_industry ON public.solution_providers(industry_segment_id);
CREATE INDEX idx_provider_specialities_provider ON public.provider_specialities(provider_id);
CREATE INDEX idx_proof_points_provider ON public.proof_points(provider_id);
CREATE INDEX idx_proof_points_type ON public.proof_points(type);
CREATE INDEX idx_proof_point_links_proof ON public.proof_point_links(proof_point_id);
CREATE INDEX idx_proof_point_files_proof ON public.proof_point_files(proof_point_id);
CREATE INDEX idx_invitations_email ON public.solution_provider_invitations(email);
CREATE INDEX idx_invitations_token ON public.solution_provider_invitations(token);
CREATE INDEX idx_question_bank_speciality ON public.question_bank(speciality_id);
CREATE INDEX idx_assessment_attempts_provider ON public.assessment_attempts(provider_id);
CREATE INDEX idx_assessment_responses_attempt ON public.assessment_attempt_responses(attempt_id);

-- =============================================
-- 6. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expertise_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participation_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proficiency_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_speciality_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_provider_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_point_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_point_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_point_speciality_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_provider_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results_rollup ENABLE ROW LEVEL SECURITY;

-- Master data: Public read access
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (is_active = true);
CREATE POLICY "Public read industry_segments" ON public.industry_segments FOR SELECT USING (is_active = true);
CREATE POLICY "Public read expertise_levels" ON public.expertise_levels FOR SELECT USING (is_active = true);
CREATE POLICY "Public read participation_modes" ON public.participation_modes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read organization_types" ON public.organization_types FOR SELECT USING (is_active = true);
CREATE POLICY "Public read academic_disciplines" ON public.academic_disciplines FOR SELECT USING (is_active = true);
CREATE POLICY "Public read academic_streams" ON public.academic_streams FOR SELECT USING (is_active = true);
CREATE POLICY "Public read academic_subjects" ON public.academic_subjects FOR SELECT USING (is_active = true);
CREATE POLICY "Public read proficiency_areas" ON public.proficiency_areas FOR SELECT USING (is_active = true);
CREATE POLICY "Public read sub_domains" ON public.sub_domains FOR SELECT USING (is_active = true);
CREATE POLICY "Public read specialities" ON public.specialities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read level_speciality_map" ON public.level_speciality_map FOR SELECT USING (true);

-- Admin write access for master data
CREATE POLICY "Admin manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage industry_segments" ON public.industry_segments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage expertise_levels" ON public.expertise_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage participation_modes" ON public.participation_modes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage organization_types" ON public.organization_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage academic_disciplines" ON public.academic_disciplines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage academic_streams" ON public.academic_streams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage academic_subjects" ON public.academic_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage proficiency_areas" ON public.proficiency_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage sub_domains" ON public.sub_domains FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage specialities" ON public.specialities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage level_speciality_map" ON public.level_speciality_map FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

-- User Roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

-- Solution Providers policies
CREATE POLICY "Providers view own record" ON public.solution_providers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Providers update own record" ON public.solution_providers FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Providers insert own record" ON public.solution_providers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin view all providers" ON public.solution_providers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Admin manage providers" ON public.solution_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

-- Student Profiles policies
CREATE POLICY "Students view own profile" ON public.student_profiles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Students update own profile" ON public.student_profiles FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Students insert own profile" ON public.student_profiles FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));

-- Organization policies
CREATE POLICY "Providers view own org" ON public.solution_provider_organizations FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Providers manage own org" ON public.solution_provider_organizations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));

-- Provider Specialities policies
CREATE POLICY "Providers view own specialities" ON public.provider_specialities FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Providers manage own specialities" ON public.provider_specialities FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));

-- Proof Points policies
CREATE POLICY "Providers view own proof points" ON public.proof_points FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()) AND is_deleted = false);
CREATE POLICY "Providers manage own proof points" ON public.proof_points FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));

-- Proof Point Links policies
CREATE POLICY "Providers view own links" ON public.proof_point_links FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "Providers manage own links" ON public.proof_point_links FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));

-- Proof Point Files policies
CREATE POLICY "Providers view own files" ON public.proof_point_files FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "Providers manage own files" ON public.proof_point_files FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));

-- Proof Point Tags policies
CREATE POLICY "Providers view own tags" ON public.proof_point_speciality_tags FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "Providers manage own tags" ON public.proof_point_speciality_tags FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.proof_points pp 
    JOIN public.solution_providers sp ON sp.id = pp.provider_id 
    WHERE pp.id = proof_point_id AND sp.user_id = auth.uid()
  ));

-- Invitations policies
CREATE POLICY "Users view own invitations" ON public.solution_provider_invitations FOR SELECT TO authenticated 
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Admin manage invitations" ON public.solution_provider_invitations FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Question Bank policies (admin only write)
CREATE POLICY "Authenticated read questions" ON public.question_bank FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin manage questions" ON public.question_bank FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

-- Assessment policies
CREATE POLICY "Providers view own attempts" ON public.assessment_attempts FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Providers create attempts" ON public.assessment_attempts FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));
CREATE POLICY "Providers update own attempts" ON public.assessment_attempts FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid()));

-- Assessment Responses policies
CREATE POLICY "Providers view own responses" ON public.assessment_attempt_responses FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts aa 
    JOIN public.solution_providers sp ON sp.id = aa.provider_id 
    WHERE aa.id = attempt_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "Providers manage own responses" ON public.assessment_attempt_responses FOR ALL TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts aa 
    JOIN public.solution_providers sp ON sp.id = aa.provider_id 
    WHERE aa.id = attempt_id AND sp.user_id = auth.uid()
  ));

-- Assessment Rollup policies
CREATE POLICY "Providers view own rollup" ON public.assessment_results_rollup FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts aa 
    JOIN public.solution_providers sp ON sp.id = aa.provider_id 
    WHERE aa.id = attempt_id AND sp.user_id = auth.uid()
  ));

-- =============================================
-- 7. TRIGGERS FOR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_industry_segments_updated_at BEFORE UPDATE ON public.industry_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expertise_levels_updated_at BEFORE UPDATE ON public.expertise_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_participation_modes_updated_at BEFORE UPDATE ON public.participation_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organization_types_updated_at BEFORE UPDATE ON public.organization_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proficiency_areas_updated_at BEFORE UPDATE ON public.proficiency_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sub_domains_updated_at BEFORE UPDATE ON public.sub_domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_specialities_updated_at BEFORE UPDATE ON public.specialities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_solution_providers_updated_at BEFORE UPDATE ON public.solution_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_solution_provider_organizations_updated_at BEFORE UPDATE ON public.solution_provider_organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proof_points_updated_at BEFORE UPDATE ON public.proof_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.solution_provider_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. SEED DATA
-- =============================================

-- Expertise Levels
INSERT INTO public.expertise_levels (level_number, name, min_years, max_years, description) VALUES
  (1, 'Entry Level', 1, 4, 'Professionals with 1-4 years of experience. Building foundational skills and gaining practical exposure.'),
  (2, 'Mid Level', 5, 9, 'Experienced professionals with 5-9 years. Demonstrate proficiency and can work independently.'),
  (3, 'Senior Level', 10, 15, 'Senior professionals with 10-15 years. Lead projects and mentor others.'),
  (4, 'Expert Level', 16, NULL, 'Industry experts with 16+ years. Strategic leaders and thought pioneers.');

-- Participation Modes
INSERT INTO public.participation_modes (code, name, description, requires_org_info, display_order) VALUES
  ('independent', 'Independent Consultant', 'Work as a freelance consultant, managing your own client relationships and projects.', false, 1),
  ('org_rep', 'Organization Representative', 'Represent your organization and engage with clients on behalf of your company.', true, 2),
  ('individual_self', 'Individual Self-Accountable', 'Work independently while being fully accountable for your deliverables and outcomes.', false, 3);

-- Organization Types
INSERT INTO public.organization_types (code, name, display_order) VALUES
  ('proprietorship', 'Proprietorship', 1),
  ('partnership', 'Partnership Firm', 2),
  ('llp', 'Limited Liability Partnership (LLP)', 3),
  ('private_limited', 'Private Limited Company', 4),
  ('public_limited', 'Public Limited Company', 5),
  ('one_person', 'One Person Company (OPC)', 6),
  ('cooperative', 'Cooperative Society', 7),
  ('trust', 'Trust', 8),
  ('ngo', 'NGO / Non-Profit', 9),
  ('government', 'Government Entity', 10),
  ('other', 'Other', 11);

-- Sample Industry Segments
INSERT INTO public.industry_segments (code, name, description, display_order) VALUES
  ('technology', 'Technology', 'Software, IT services, hardware, and digital solutions', 1),
  ('healthcare', 'Healthcare', 'Medical services, pharmaceuticals, and health technology', 2),
  ('finance', 'Finance', 'Banking, insurance, investment, and financial services', 3),
  ('manufacturing', 'Manufacturing', 'Industrial production, engineering, and supply chain', 4),
  ('retail', 'Retail', 'Consumer goods, e-commerce, and retail operations', 5),
  ('education', 'Education', 'Academic institutions, ed-tech, and training services', 6),
  ('consulting', 'Consulting', 'Business advisory, strategy, and management consulting', 7),
  ('energy', 'Energy', 'Power generation, renewables, oil and gas', 8);

-- Sample Countries (Top 20)
INSERT INTO public.countries (code, name, phone_code, display_order) VALUES
  ('IN', 'India', '+91', 1),
  ('US', 'United States', '+1', 2),
  ('GB', 'United Kingdom', '+44', 3),
  ('CA', 'Canada', '+1', 4),
  ('AU', 'Australia', '+61', 5),
  ('DE', 'Germany', '+49', 6),
  ('FR', 'France', '+33', 7),
  ('JP', 'Japan', '+81', 8),
  ('SG', 'Singapore', '+65', 9),
  ('AE', 'United Arab Emirates', '+971', 10),
  ('NL', 'Netherlands', '+31', 11),
  ('CH', 'Switzerland', '+41', 12),
  ('SE', 'Sweden', '+46', 13),
  ('BR', 'Brazil', '+55', 14),
  ('MX', 'Mexico', '+52', 15),
  ('ZA', 'South Africa', '+27', 16),
  ('NZ', 'New Zealand', '+64', 17),
  ('IE', 'Ireland', '+353', 18),
  ('IL', 'Israel', '+972', 19),
  ('KR', 'South Korea', '+82', 20);

-- Sample Academic Disciplines
INSERT INTO public.academic_disciplines (name, display_order) VALUES
  ('Engineering', 1),
  ('Computer Science', 2),
  ('Business Administration', 3),
  ('Science', 4),
  ('Arts & Humanities', 5),
  ('Medicine', 6),
  ('Law', 7),
  ('Design', 8);

-- Sample Academic Streams (for Engineering)
INSERT INTO public.academic_streams (discipline_id, name, display_order)
SELECT id, 'Computer Engineering', 1 FROM public.academic_disciplines WHERE name = 'Engineering'
UNION ALL
SELECT id, 'Mechanical Engineering', 2 FROM public.academic_disciplines WHERE name = 'Engineering'
UNION ALL
SELECT id, 'Electrical Engineering', 3 FROM public.academic_disciplines WHERE name = 'Engineering'
UNION ALL
SELECT id, 'Civil Engineering', 4 FROM public.academic_disciplines WHERE name = 'Engineering';

-- Sample Proficiency Areas (for Technology)
INSERT INTO public.proficiency_areas (industry_segment_id, name, description, display_order)
SELECT id, 'Software Development', 'Building and maintaining software applications', 1 FROM public.industry_segments WHERE code = 'technology'
UNION ALL
SELECT id, 'Data & Analytics', 'Data engineering, analytics, and business intelligence', 2 FROM public.industry_segments WHERE code = 'technology'
UNION ALL
SELECT id, 'Cloud & Infrastructure', 'Cloud computing, DevOps, and infrastructure management', 3 FROM public.industry_segments WHERE code = 'technology'
UNION ALL
SELECT id, 'Cybersecurity', 'Information security and risk management', 4 FROM public.industry_segments WHERE code = 'technology';

-- Sample Sub-Domains (for Software Development)
INSERT INTO public.sub_domains (proficiency_area_id, name, description, display_order)
SELECT id, 'Frontend Development', 'User interface and client-side development', 1 FROM public.proficiency_areas WHERE name = 'Software Development'
UNION ALL
SELECT id, 'Backend Development', 'Server-side logic and APIs', 2 FROM public.proficiency_areas WHERE name = 'Software Development'
UNION ALL
SELECT id, 'Mobile Development', 'iOS, Android, and cross-platform mobile apps', 3 FROM public.proficiency_areas WHERE name = 'Software Development'
UNION ALL
SELECT id, 'Full Stack Development', 'End-to-end application development', 4 FROM public.proficiency_areas WHERE name = 'Software Development';

-- Sample Specialities (for Frontend Development)
INSERT INTO public.specialities (sub_domain_id, name, description, display_order)
SELECT id, 'React.js', 'Building UIs with React and its ecosystem', 1 FROM public.sub_domains WHERE name = 'Frontend Development'
UNION ALL
SELECT id, 'Vue.js', 'Vue framework and related tooling', 2 FROM public.sub_domains WHERE name = 'Frontend Development'
UNION ALL
SELECT id, 'Angular', 'Enterprise Angular applications', 3 FROM public.sub_domains WHERE name = 'Frontend Development'
UNION ALL
SELECT id, 'TypeScript', 'Type-safe JavaScript development', 4 FROM public.sub_domains WHERE name = 'Frontend Development'
UNION ALL
SELECT id, 'CSS & Design Systems', 'Styling, animations, and design system implementation', 5 FROM public.sub_domains WHERE name = 'Frontend Development';

-- Map specialities to expertise levels (all specialities available for all levels in this sample)
INSERT INTO public.level_speciality_map (expertise_level_id, speciality_id)
SELECT el.id, s.id
FROM public.expertise_levels el
CROSS JOIN public.specialities s;