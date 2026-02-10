
-- =====================================================
-- SEEKER ORGANIZATION REGISTRATION - FULL SCHEMA MIGRATION
-- Extends existing tables + creates new seeker tables
-- Multi-tenant with 3-layer isolation
-- =====================================================

-- =========================
-- PHASE 1: EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- PHASE 2: ENUM TYPES (11)
-- =========================
DO $$ BEGIN CREATE TYPE document_type_enum AS ENUM ('logo','profile','verification','custom_nda'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_verification_status_enum AS ENUM ('pending','verified','rejected','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE contact_type_enum AS ENUM ('primary','billing','technical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE nda_preference_enum AS ENUM ('standard_platform_nda','custom_nda'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE nda_review_status_enum AS ENUM ('not_applicable','pending_review','under_review','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE subscription_status_enum AS ENUM ('pending_billing','active','suspended','cancelled','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method_type_enum AS ENUM ('credit_card','ach_bank_transfer','wire_transfer','shadow'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_type_enum AS ENUM ('live','shadow'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enterprise_request_status_enum AS ENUM ('new','contacted','qualified','converted','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE org_verification_status_enum AS ENUM ('unverified','pending','verified','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE access_type_enum AS ENUM ('included','available','not_available'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- PHASE 3: ALTER EXISTING TABLES
-- =========================

-- 3.1 countries: Add 9 columns (existing 20 rows preserved, new cols get defaults)
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS iso_alpha3 CHAR(3);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_code CHAR(3);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) NOT NULL DEFAULT '$';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) NOT NULL DEFAULT '#,###.##';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS address_format_template JSONB;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS is_ofac_restricted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_code_display VARCHAR(20);

-- 3.2 industry_segments: Add parent_id for hierarchy (existing 9 rows get NULL = top-level)
ALTER TABLE public.industry_segments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.industry_segments(id);

-- =========================
-- PHASE 4: NEW MASTER DATA TABLES (17 including extension table)
-- =========================

-- 4.1 org_type_seeker_rules (extension of organization_types)
CREATE TABLE IF NOT EXISTS public.org_type_seeker_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type_id UUID NOT NULL REFERENCES public.organization_types(id),
  tier_recommendation VARCHAR(50),
  subsidized_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_required BOOLEAN NOT NULL DEFAULT FALSE,
  zero_fee_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  startup_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(org_type_id)
);

-- 4.2 md_states_provinces
CREATE TABLE IF NOT EXISTS public.md_states_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(country_id, code)
);

-- 4.3 md_languages
CREATE TABLE IF NOT EXISTS public.md_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.4 md_functional_areas
CREATE TABLE IF NOT EXISTS public.md_functional_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.5 md_blocked_email_domains
CREATE TABLE IF NOT EXISTS public.md_blocked_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(100) DEFAULT 'free_email',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.6 md_tax_formats
CREATE TABLE IF NOT EXISTS public.md_tax_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  tax_name VARCHAR(100) NOT NULL,
  format_regex VARCHAR(255),
  example VARCHAR(100),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.7 md_export_control_statuses
CREATE TABLE IF NOT EXISTS public.md_export_control_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_itar_compliance BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.8 md_data_residency
CREATE TABLE IF NOT EXISTS public.md_data_residency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.9 md_subscription_tiers
CREATE TABLE IF NOT EXISTS public.md_subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  max_users INTEGER,
  max_challenges INTEGER,
  is_enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.10 md_tier_country_pricing
CREATE TABLE IF NOT EXISTS public.md_tier_country_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  monthly_price_usd DECIMAL(10,2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  local_price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tier_id, country_id)
);

-- 4.11 md_tier_features
CREATE TABLE IF NOT EXISTS public.md_tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  feature_code VARCHAR(100) NOT NULL,
  feature_name VARCHAR(200) NOT NULL,
  access_type access_type_enum NOT NULL DEFAULT 'not_available',
  usage_limit INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tier_id, feature_code)
);

-- 4.12 md_engagement_models
CREATE TABLE IF NOT EXISTS public.md_engagement_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.13 md_tier_engagement_access
CREATE TABLE IF NOT EXISTS public.md_tier_engagement_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  engagement_model_id UUID NOT NULL REFERENCES public.md_engagement_models(id),
  access_type access_type_enum NOT NULL DEFAULT 'not_available',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tier_id, engagement_model_id)
);

-- 4.14 md_billing_cycles
CREATE TABLE IF NOT EXISTS public.md_billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  months INTEGER NOT NULL,
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.15 md_subsidized_pricing
CREATE TABLE IF NOT EXISTS public.md_subsidized_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type_rule_id UUID NOT NULL REFERENCES public.org_type_seeker_rules(id),
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_duration_months INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.16 md_payment_methods_availability
CREATE TABLE IF NOT EXISTS public.md_payment_methods_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  tier_id UUID REFERENCES public.md_subscription_tiers(id),
  payment_method payment_method_type_enum NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4.17 md_postal_formats
CREATE TABLE IF NOT EXISTS public.md_postal_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) UNIQUE,
  format_regex VARCHAR(255),
  example VARCHAR(50),
  label VARCHAR(50) DEFAULT 'Postal Code',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =========================
-- PHASE 5: PLATFORM TABLE
-- =========================

CREATE TABLE IF NOT EXISTS public.platform_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Partial unique index: only one active version at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_terms_single_active
  ON public.platform_terms (is_active) WHERE is_active = TRUE;

-- =========================
-- PHASE 6: BUSINESS TABLES (tenant-scoped)
-- =========================

-- 6.1 seeker_organizations (the tenant root table)
CREATE TABLE IF NOT EXISTS public.seeker_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- set by trigger to equal id
  organization_name VARCHAR(200) NOT NULL,
  organization_type_id UUID REFERENCES public.organization_types(id),
  legal_entity_name VARCHAR(200),
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  website_url VARCHAR(500),
  hq_country_id UUID REFERENCES public.countries(id),
  hq_state_province_id UUID REFERENCES public.md_states_provinces(id),
  hq_city VARCHAR(100),
  hq_postal_code VARCHAR(20),
  hq_address_line1 VARCHAR(300),
  hq_address_line2 VARCHAR(300),
  employee_count_range VARCHAR(50),
  annual_revenue_range VARCHAR(50),
  founding_year INTEGER,
  organization_description TEXT,
  logo_url TEXT,
  is_enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status org_verification_status_enum NOT NULL DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  nda_preference nda_preference_enum DEFAULT 'standard_platform_nda',
  nda_review_status nda_review_status_enum DEFAULT 'not_applicable',
  custom_nda_document_id UUID,
  preferred_language_id UUID REFERENCES public.md_languages(id),
  preferred_currency CHAR(3) DEFAULT 'USD',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  number_format VARCHAR(20) DEFAULT '#,###.##',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Self-referencing FK for tenant_id
ALTER TABLE public.seeker_organizations
  ADD CONSTRAINT fk_seeker_org_tenant FOREIGN KEY (tenant_id) REFERENCES public.seeker_organizations(id) DEFERRABLE INITIALLY DEFERRED;

-- 6.2 seeker_org_industries (junction: org <-> industry_segments)
CREATE TABLE IF NOT EXISTS public.seeker_org_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  industry_id UUID NOT NULL REFERENCES public.industry_segments(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, industry_id)
);

-- 6.3 seeker_org_geographies (junction: org <-> countries for operating regions)
CREATE TABLE IF NOT EXISTS public.seeker_org_geographies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, country_id)
);

-- 6.4 seeker_org_documents
CREATE TABLE IF NOT EXISTS public.seeker_org_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  document_type document_type_enum NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  verification_status document_verification_status_enum NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.5 seeker_contacts
CREATE TABLE IF NOT EXISTS public.seeker_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  contact_type contact_type_enum NOT NULL DEFAULT 'primary',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  phone_country_code VARCHAR(10),
  phone_number VARCHAR(30),
  job_title VARCHAR(150),
  functional_area_id UUID REFERENCES public.md_functional_areas(id),
  preferred_language_id UUID REFERENCES public.md_languages(id),
  is_decision_maker BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.6 email_otp_verifications (server-only)
CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  email VARCHAR(255) NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  verified_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.7 seeker_compliance
CREATE TABLE IF NOT EXISTS public.seeker_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) UNIQUE,
  export_control_status_id UUID REFERENCES public.md_export_control_statuses(id),
  itar_certified BOOLEAN NOT NULL DEFAULT FALSE,
  itar_certification_expiry DATE,
  data_residency_id UUID REFERENCES public.md_data_residency(id),
  gdpr_compliant BOOLEAN NOT NULL DEFAULT FALSE,
  hipaa_compliant BOOLEAN NOT NULL DEFAULT FALSE,
  soc2_compliant BOOLEAN NOT NULL DEFAULT FALSE,
  iso27001_certified BOOLEAN NOT NULL DEFAULT FALSE,
  additional_certifications JSONB,
  compliance_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.8 seeker_subscriptions
CREATE TABLE IF NOT EXISTS public.seeker_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  billing_cycle_id UUID NOT NULL REFERENCES public.md_billing_cycles(id),
  engagement_model_id UUID REFERENCES public.md_engagement_models(id),
  status subscription_status_enum NOT NULL DEFAULT 'pending_billing',
  payment_type payment_type_enum NOT NULL DEFAULT 'live',
  monthly_base_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  effective_monthly_cost DECIMAL(10,2),
  starts_at DATE,
  ends_at DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  terms_version VARCHAR(20),
  terms_accepted_at TIMESTAMPTZ,
  terms_accepted_by UUID REFERENCES auth.users(id),
  terms_acceptance_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.9 enterprise_contact_requests
CREATE TABLE IF NOT EXISTS public.enterprise_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  contact_name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  company_size VARCHAR(50),
  message TEXT,
  status enterprise_request_status_enum NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.10 seeker_billing_info
CREATE TABLE IF NOT EXISTS public.seeker_billing_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) UNIQUE,
  billing_entity_name VARCHAR(200),
  billing_address_line1 VARCHAR(300),
  billing_address_line2 VARCHAR(300),
  billing_city VARCHAR(100),
  billing_state_province_id UUID REFERENCES public.md_states_provinces(id),
  billing_postal_code VARCHAR(20),
  billing_country_id UUID REFERENCES public.countries(id),
  tax_id VARCHAR(100),
  tax_id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method payment_method_type_enum,
  payment_reference TEXT,
  billing_cycle_id UUID REFERENCES public.md_billing_cycles(id),
  billing_email VARCHAR(255),
  po_number VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6.11 seeker_onboarding
CREATE TABLE IF NOT EXISTS public.seeker_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) UNIQUE,
  has_posted_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  has_invited_team_member BOOLEAN NOT NULL DEFAULT FALSE,
  has_viewed_provider_profiles BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  current_step INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =========================
-- PHASE 7: SUPPORTING/STUB TABLES
-- =========================

-- 7.1 org_users (user-to-org membership for tenant resolution)
CREATE TABLE IF NOT EXISTS public.org_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, organization_id)
);

-- 7.2 user_invitations
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  token_hash TEXT,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 7.3 challenges (stub for onboarding checks)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 7.4 solver_profile_views
CREATE TABLE IF NOT EXISTS public.solver_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id),
  viewed_by UUID REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- PHASE 8: INDEXES (~65)
-- =========================

-- countries extensions
CREATE INDEX IF NOT EXISTS idx_countries_iso_alpha3 ON public.countries(iso_alpha3) WHERE iso_alpha3 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_countries_ofac ON public.countries(is_ofac_restricted) WHERE is_ofac_restricted = TRUE;

-- industry_segments extension
CREATE INDEX IF NOT EXISTS idx_industry_segments_parent ON public.industry_segments(parent_id) WHERE parent_id IS NOT NULL;

-- org_type_seeker_rules
CREATE INDEX IF NOT EXISTS idx_org_type_rules_type ON public.org_type_seeker_rules(org_type_id);

-- md_states_provinces
CREATE INDEX IF NOT EXISTS idx_states_country ON public.md_states_provinces(country_id);

-- md_tax_formats
CREATE INDEX IF NOT EXISTS idx_tax_formats_country ON public.md_tax_formats(country_id);

-- md_tier_country_pricing
CREATE INDEX IF NOT EXISTS idx_tier_pricing_tier ON public.md_tier_country_pricing(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_pricing_country ON public.md_tier_country_pricing(country_id);

-- md_tier_features
CREATE INDEX IF NOT EXISTS idx_tier_features_tier ON public.md_tier_features(tier_id);

-- md_tier_engagement_access
CREATE INDEX IF NOT EXISTS idx_tier_engagement_tier ON public.md_tier_engagement_access(tier_id);
CREATE INDEX IF NOT EXISTS idx_tier_engagement_model ON public.md_tier_engagement_access(engagement_model_id);

-- md_payment_methods_availability
CREATE INDEX IF NOT EXISTS idx_payment_methods_country ON public.md_payment_methods_availability(country_id);

-- md_postal_formats
CREATE INDEX IF NOT EXISTS idx_postal_formats_country ON public.md_postal_formats(country_id);

-- seeker_organizations (tenant root)
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_tenant ON public.seeker_organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_country ON public.seeker_organizations(hq_country_id);
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_type ON public.seeker_organizations(organization_type_id);
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_verification ON public.seeker_organizations(verification_status);
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_active ON public.seeker_organizations(is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_seeker_orgs_name_trgm ON public.seeker_organizations USING GIN (organization_name gin_trgm_ops);

-- seeker_org_industries
CREATE INDEX IF NOT EXISTS idx_seeker_industries_tenant ON public.seeker_org_industries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_industries_org ON public.seeker_org_industries(organization_id);
CREATE INDEX IF NOT EXISTS idx_seeker_industries_industry ON public.seeker_org_industries(industry_id);

-- seeker_org_geographies
CREATE INDEX IF NOT EXISTS idx_seeker_geo_tenant ON public.seeker_org_geographies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_geo_org ON public.seeker_org_geographies(organization_id);
CREATE INDEX IF NOT EXISTS idx_seeker_geo_country ON public.seeker_org_geographies(country_id);

-- seeker_org_documents
CREATE INDEX IF NOT EXISTS idx_seeker_docs_tenant ON public.seeker_org_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_docs_org ON public.seeker_org_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_seeker_docs_type ON public.seeker_org_documents(document_type);

-- seeker_contacts
CREATE INDEX IF NOT EXISTS idx_seeker_contacts_tenant ON public.seeker_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seeker_contacts_org ON public.seeker_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_seeker_contacts_email ON public.seeker_contacts(email);
CREATE INDEX IF NOT EXISTS idx_seeker_contacts_type ON public.seeker_contacts(contact_type);

-- email_otp_verifications
CREATE INDEX IF NOT EXISTS idx_otp_tenant ON public.email_otp_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.email_otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.email_otp_verifications(expires_at) WHERE is_used = FALSE;

-- seeker_compliance
CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON public.seeker_compliance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_org ON public.seeker_compliance(organization_id);

-- seeker_subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.seeker_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.seeker_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.seeker_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.seeker_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.seeker_subscriptions(is_active, status);

-- enterprise_contact_requests
CREATE INDEX IF NOT EXISTS idx_enterprise_req_tenant ON public.enterprise_contact_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_req_org ON public.enterprise_contact_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_req_status ON public.enterprise_contact_requests(status);

-- seeker_billing_info
CREATE INDEX IF NOT EXISTS idx_billing_tenant ON public.seeker_billing_info(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_org ON public.seeker_billing_info(organization_id);

-- seeker_onboarding
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON public.seeker_onboarding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_org ON public.seeker_onboarding(organization_id);

-- org_users
CREATE INDEX IF NOT EXISTS idx_org_users_tenant ON public.org_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON public.org_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org ON public.org_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_active ON public.org_users(user_id, is_active);

-- user_invitations
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.user_invitations(email);

-- challenges
CREATE INDEX IF NOT EXISTS idx_challenges_tenant ON public.challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenges_org ON public.challenges(organization_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.challenges(is_active, is_deleted);

-- solver_profile_views
CREATE INDEX IF NOT EXISTS idx_profile_views_tenant ON public.solver_profile_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_org ON public.solver_profile_views(organization_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_provider ON public.solver_profile_views(provider_id);

-- =========================
-- PHASE 9: FUNCTIONS (17)
-- =========================

-- 9.1 Tenant resolution (critical for RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM org_users
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

-- 9.2 Auth user ID wrapper
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

-- 9.3 Set updated_at trigger function (for new tables only)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9.4 Set tenant_id = id on org INSERT
CREATE OR REPLACE FUNCTION public.trigger_set_org_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.tenant_id = NEW.id;
  RETURN NEW;
END;
$$;

-- 9.5 Enterprise auto-flag trigger
CREATE OR REPLACE FUNCTION public.trigger_enterprise_auto_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.annual_revenue_range IN ('>$1B', '$500M-$1B') OR
     NEW.employee_count_range IN ('5001-10000', '10001+') THEN
    NEW.is_enterprise = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

-- 9.6 ITAR cascade trigger
CREATE OR REPLACE FUNCTION public.trigger_itar_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_requires_itar BOOLEAN;
BEGIN
  IF NEW.export_control_status_id IS NOT NULL THEN
    SELECT requires_itar_compliance INTO v_requires_itar
    FROM md_export_control_statuses
    WHERE id = NEW.export_control_status_id;

    IF v_requires_itar THEN
      NEW.itar_certified = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 9.7 Country format populate trigger
CREATE OR REPLACE FUNCTION public.trigger_country_format_populate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_country RECORD;
BEGIN
  IF NEW.hq_country_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.hq_country_id IS DISTINCT FROM NEW.hq_country_id) THEN
    SELECT currency_code, currency_symbol, date_format, number_format
    INTO v_country
    FROM countries WHERE id = NEW.hq_country_id;

    IF v_country IS NOT NULL THEN
      NEW.preferred_currency = COALESCE(NEW.preferred_currency, v_country.currency_code, 'USD');
      NEW.date_format = COALESCE(v_country.date_format, 'YYYY-MM-DD');
      NEW.number_format = COALESCE(v_country.number_format, '#,###.##');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 9.8 Onboarding completion check trigger
CREATE OR REPLACE FUNCTION public.trigger_onboarding_completion_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.has_posted_challenge AND NEW.has_invited_team_member AND NEW.has_viewed_provider_profiles THEN
    NEW.onboarding_completed = TRUE;
    NEW.onboarding_completed_at = COALESCE(NEW.onboarding_completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

-- 9.9 Deactivate old terms on new activation
CREATE OR REPLACE FUNCTION public.trigger_deactivate_old_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE platform_terms SET is_active = FALSE, updated_at = NOW()
    WHERE id != NEW.id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

-- 9.10 Duplicate org detection (trigram)
CREATE OR REPLACE FUNCTION public.check_duplicate_organization(
  p_org_name TEXT,
  p_country_id UUID DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, organization_name VARCHAR, similarity_score REAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT so.id, so.organization_name,
         similarity(so.organization_name, p_org_name) AS similarity_score
  FROM seeker_organizations so
  WHERE similarity(so.organization_name, p_org_name) > 0.4
    AND so.is_deleted = FALSE
    AND (p_country_id IS NULL OR so.hq_country_id = p_country_id)
    AND (p_exclude_id IS NULL OR so.id != p_exclude_id)
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$;

-- 9.11 Calculate effective monthly cost
CREATE OR REPLACE FUNCTION public.calculate_effective_monthly_cost(
  p_base_price DECIMAL,
  p_discount_pct DECIMAL,
  p_billing_months INTEGER
)
RETURNS DECIMAL
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(p_base_price * (1 - COALESCE(p_discount_pct, 0) / 100.0) * (1 - CASE WHEN p_billing_months >= 12 THEN 0.17 WHEN p_billing_months >= 3 THEN 0.08 ELSE 0 END), 2);
$$;

-- 9.12 Email domain blocklist check
CREATE OR REPLACE FUNCTION public.is_email_domain_blocked(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM md_blocked_email_domains
    WHERE domain = LOWER(SPLIT_PART(p_email, '@', 2))
      AND is_active = TRUE
  );
$$;

-- 9.13 Tax ID validation
CREATE OR REPLACE FUNCTION public.validate_tax_id(p_country_id UUID, p_tax_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regex VARCHAR;
BEGIN
  SELECT format_regex INTO v_regex
  FROM md_tax_formats
  WHERE country_id = p_country_id AND is_active = TRUE
  LIMIT 1;

  IF v_regex IS NULL THEN RETURN TRUE; END IF;
  RETURN p_tax_id ~ v_regex;
END;
$$;

-- 9.14 Terms acceptance hash
CREATE OR REPLACE FUNCTION public.generate_terms_acceptance_hash(
  p_org_id UUID,
  p_terms_version TEXT,
  p_accepted_by UUID,
  p_accepted_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(
    p_org_id::TEXT || '|' || p_terms_version || '|' || p_accepted_by::TEXT || '|' || p_accepted_at::TEXT,
    'sha256'
  ), 'hex');
$$;

-- 9.15 Cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM email_otp_verifications
  WHERE expires_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 9.16 Check user limit per tier
CREATE OR REPLACE FUNCTION public.check_user_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_users INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT st.max_users INTO v_max_users
  FROM seeker_subscriptions ss
  JOIN md_subscription_tiers st ON st.id = ss.tier_id
  WHERE ss.organization_id = p_org_id AND ss.is_active = TRUE AND ss.status = 'active'
  ORDER BY ss.created_at DESC LIMIT 1;

  IF v_max_users IS NULL THEN RETURN TRUE; END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM org_users WHERE organization_id = p_org_id AND is_active = TRUE;

  RETURN v_current_count < v_max_users;
END;
$$;

-- 9.17 Engagement model switch guard
CREATE OR REPLACE FUNCTION public.can_switch_engagement_model(p_org_id UUID, p_new_model_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_id UUID;
  v_access access_type_enum;
BEGIN
  SELECT ss.tier_id INTO v_tier_id
  FROM seeker_subscriptions ss
  WHERE ss.organization_id = p_org_id AND ss.is_active = TRUE AND ss.status = 'active'
  ORDER BY ss.created_at DESC LIMIT 1;

  IF v_tier_id IS NULL THEN RETURN FALSE; END IF;

  SELECT tea.access_type INTO v_access
  FROM md_tier_engagement_access tea
  WHERE tea.tier_id = v_tier_id AND tea.engagement_model_id = p_new_model_id AND tea.is_active = TRUE;

  RETURN v_access IN ('included', 'available');
END;
$$;

-- =========================
-- PHASE 10: RLS POLICIES
-- =========================

-- Master data tables: public SELECT for active records + platform admin full access
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'org_type_seeker_rules','md_states_provinces','md_languages','md_functional_areas',
    'md_blocked_email_domains','md_tax_formats','md_export_control_statuses','md_data_residency',
    'md_subscription_tiers','md_tier_country_pricing','md_tier_features','md_engagement_models',
    'md_tier_engagement_access','md_billing_cycles','md_subsidized_pricing',
    'md_payment_methods_availability','md_postal_formats'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Public read active %1$s" ON public.%1$I FOR SELECT USING (is_active = TRUE)', t);
    EXECUTE format('CREATE POLICY "Admin full access %1$s" ON public.%1$I FOR ALL USING (has_role(auth.uid(), ''platform_admin''::app_role))', t);
  END LOOP;
END $$;

-- Platform terms: public SELECT active
ALTER TABLE public.platform_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active terms" ON public.platform_terms FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin full access terms" ON public.platform_terms FOR ALL USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Tenant-scoped business tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'seeker_org_industries','seeker_org_geographies','seeker_org_documents',
    'seeker_contacts','seeker_compliance','seeker_subscriptions',
    'enterprise_contact_requests','seeker_billing_info','seeker_onboarding',
    'org_users','user_invitations','challenges','solver_profile_views'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Tenant isolation %1$s" ON public.%1$I FOR ALL USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), ''platform_admin''::app_role))', t);
  END LOOP;
END $$;

-- seeker_organizations: special handling (pre-auth INSERT allowed)
ALTER TABLE public.seeker_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant read own org" ON public.seeker_organizations FOR SELECT
  USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'platform_admin'::app_role));
CREATE POLICY "Tenant update own org" ON public.seeker_organizations FOR UPDATE
  USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'platform_admin'::app_role));
CREATE POLICY "Pre-auth registration insert" ON public.seeker_organizations FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "Admin delete org" ON public.seeker_organizations FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- email_otp_verifications: server-only (no direct client access)
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only OTP" ON public.email_otp_verifications FOR ALL USING (FALSE);
CREATE POLICY "Admin OTP access" ON public.email_otp_verifications FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =========================
-- PHASE 11: TRIGGERS (attached to new tables only)
-- =========================

-- updated_at triggers on all new business/master data tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'org_type_seeker_rules','md_states_provinces','md_languages','md_functional_areas',
    'md_blocked_email_domains','md_tax_formats','md_export_control_statuses','md_data_residency',
    'md_subscription_tiers','md_tier_country_pricing','md_tier_features','md_engagement_models',
    'md_tier_engagement_access','md_billing_cycles','md_subsidized_pricing',
    'md_payment_methods_availability','md_postal_formats','platform_terms',
    'seeker_organizations','seeker_org_industries','seeker_org_geographies',
    'seeker_org_documents','seeker_contacts','seeker_compliance',
    'seeker_subscriptions','enterprise_contact_requests','seeker_billing_info',
    'seeker_onboarding','org_users','user_invitations','challenges'
  ])
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at_%1$s
      BEFORE UPDATE ON public.%1$I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
    ', t);
  END LOOP;
END $$;

-- Org tenant_id auto-set
CREATE TRIGGER set_org_tenant_id
  BEFORE INSERT ON public.seeker_organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_org_tenant_id();

-- Enterprise auto-flag
CREATE TRIGGER enterprise_auto_flag
  BEFORE INSERT OR UPDATE ON public.seeker_organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_enterprise_auto_flag();

-- Country format populate
CREATE TRIGGER country_format_populate
  BEFORE INSERT OR UPDATE ON public.seeker_organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_country_format_populate();

-- ITAR cascade
CREATE TRIGGER itar_cascade
  BEFORE INSERT OR UPDATE ON public.seeker_compliance
  FOR EACH ROW EXECUTE FUNCTION trigger_itar_cascade();

-- Onboarding completion check
CREATE TRIGGER onboarding_completion_check
  BEFORE UPDATE ON public.seeker_onboarding
  FOR EACH ROW EXECUTE FUNCTION trigger_onboarding_completion_check();

-- Deactivate old terms
CREATE TRIGGER deactivate_old_terms
  BEFORE INSERT OR UPDATE ON public.platform_terms
  FOR EACH ROW EXECUTE FUNCTION trigger_deactivate_old_terms();

-- =========================
-- PHASE 12: SEED DATA (idempotent)
-- =========================

-- Subscription tiers
INSERT INTO public.md_subscription_tiers (code, name, description, max_users, max_challenges, is_enterprise, display_order)
VALUES
  ('basic', 'Basic', 'Starter plan for small teams', 5, 3, FALSE, 1),
  ('standard', 'Standard', 'Professional plan for growing organizations', 25, 15, FALSE, 2),
  ('premium', 'Premium', 'Enterprise-grade plan with unlimited access', NULL, NULL, TRUE, 3)
ON CONFLICT (code) DO NOTHING;

-- Billing cycles
INSERT INTO public.md_billing_cycles (code, name, months, discount_percentage, display_order)
VALUES
  ('monthly', 'Monthly', 1, 0, 1),
  ('quarterly', 'Quarterly', 3, 8, 2),
  ('annual', 'Annual', 12, 17, 3)
ON CONFLICT (code) DO NOTHING;

-- Export control statuses
INSERT INTO public.md_export_control_statuses (code, name, description, requires_itar_compliance, display_order)
VALUES
  ('none', 'None', 'No export control restrictions', FALSE, 1),
  ('ear', 'EAR', 'Export Administration Regulations', FALSE, 2),
  ('itar', 'ITAR', 'International Traffic in Arms Regulations', TRUE, 3)
ON CONFLICT (code) DO NOTHING;

-- Data residency regions
INSERT INTO public.md_data_residency (code, name, description, display_order)
VALUES
  ('us', 'United States', 'Data stored in US data centers', 1),
  ('eu', 'European Union', 'Data stored in EU data centers (GDPR compliant)', 2),
  ('apac', 'Asia Pacific', 'Data stored in APAC data centers', 3),
  ('mena', 'Middle East & North Africa', 'Data stored in MENA region', 4),
  ('latam', 'Latin America', 'Data stored in LATAM data centers', 5),
  ('global', 'Global (Multi-Region)', 'Data replicated across multiple regions', 6)
ON CONFLICT (code) DO NOTHING;

-- Languages
INSERT INTO public.md_languages (code, name, native_name, display_order)
VALUES
  ('en', 'English', 'English', 1),
  ('es', 'Spanish', 'Español', 2),
  ('fr', 'French', 'Français', 3),
  ('de', 'German', 'Deutsch', 4),
  ('pt', 'Portuguese', 'Português', 5),
  ('zh', 'Chinese (Simplified)', '简体中文', 6),
  ('ja', 'Japanese', '日本語', 7),
  ('ko', 'Korean', '한국어', 8),
  ('ar', 'Arabic', 'العربية', 9),
  ('hi', 'Hindi', 'हिन्दी', 10),
  ('it', 'Italian', 'Italiano', 11),
  ('nl', 'Dutch', 'Nederlands', 12)
ON CONFLICT (code) DO NOTHING;

-- Blocked email domains
INSERT INTO public.md_blocked_email_domains (domain, reason)
VALUES
  ('gmail.com', 'free_email'),
  ('yahoo.com', 'free_email'),
  ('hotmail.com', 'free_email'),
  ('outlook.com', 'free_email'),
  ('aol.com', 'free_email'),
  ('icloud.com', 'free_email'),
  ('protonmail.com', 'free_email'),
  ('mail.com', 'free_email')
ON CONFLICT (domain) DO NOTHING;
