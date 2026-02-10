
-- ============================================================
-- PHASE 1 FOUNDATION MIGRATION
-- Creates missing master data tables, audit table, adds columns,
-- triggers, indexes, RLS policies, and seed data
-- ============================================================

-- ============================================================
-- 1. MD_INDUSTRIES (Seeker-facing industry tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.md_industries (code, name, description, display_order) VALUES
  ('technology', 'Technology', 'Information technology, software, hardware', 1),
  ('healthcare', 'Healthcare', 'Healthcare, pharmaceuticals, medical devices', 2),
  ('manufacturing', 'Manufacturing', 'Industrial manufacturing and production', 3),
  ('finance', 'Finance', 'Banking, insurance, financial services', 4),
  ('retail', 'Retail', 'Retail, e-commerce, consumer goods', 5),
  ('energy', 'Energy', 'Energy, oil & gas, renewables', 6),
  ('education', 'Education', 'Education, edtech, academic institutions', 7),
  ('transportation', 'Transportation', 'Transportation, logistics, supply chain', 8);

-- ============================================================
-- 2. MD_CHALLENGE_COMPLEXITY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_challenge_complexity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complexity_code VARCHAR(20) NOT NULL UNIQUE CHECK (complexity_code IN ('simple','moderate','complex')),
  complexity_label VARCHAR(50) NOT NULL,
  complexity_level INT NOT NULL CHECK (complexity_level BETWEEN 1 AND 3),
  consulting_fee_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  management_fee_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.md_challenge_complexity (complexity_code, complexity_label, complexity_level, consulting_fee_multiplier, management_fee_multiplier, description, display_order) VALUES
  ('simple', 'Simple', 1, 1.00, 1.00, 'Straightforward challenges with clear scope', 1),
  ('moderate', 'Moderate', 2, 1.50, 1.25, 'Multi-faceted challenges requiring specialized expertise', 2),
  ('complex', 'Complex', 3, 2.00, 1.50, 'High-complexity challenges with advanced requirements', 3);

-- ============================================================
-- 3. MD_CHALLENGE_BASE_FEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_challenge_base_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  consulting_base_fee DECIMAL(12,2) NOT NULL,
  management_base_fee DECIMAL(12,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(country_id, tier_id)
);

-- ============================================================
-- 4. MD_CHALLENGE_ACTIVE_STATUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_challenge_active_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_code VARCHAR(50) NOT NULL UNIQUE,
  status_label VARCHAR(100) NOT NULL,
  blocks_model_switch BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.md_challenge_active_statuses (status_code, status_label, blocks_model_switch, display_order) VALUES
  ('draft', 'Draft', TRUE, 1),
  ('in_review', 'In Review', TRUE, 2),
  ('scheduled', 'Scheduled', TRUE, 3),
  ('published', 'Published', TRUE, 4),
  ('extended', 'Extended', TRUE, 5),
  ('evaluation', 'Evaluation', TRUE, 6),
  ('awarded', 'Awarded', TRUE, 7),
  ('disputed', 'Disputed', TRUE, 8),
  ('completed', 'Completed', FALSE, 9),
  ('cancelled', 'Cancelled', FALSE, 10);

-- ============================================================
-- 5. MD_SHADOW_PRICING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_shadow_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  shadow_charge_per_challenge DECIMAL(10,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed shadow pricing (will use actual tier IDs)
INSERT INTO public.md_shadow_pricing (tier_id, shadow_charge_per_challenge, description)
SELECT id, 100.00, 'Basic internal cost allocation' FROM public.md_subscription_tiers WHERE code = 'basic'
UNION ALL
SELECT id, 75.00, 'Standard internal cost allocation' FROM public.md_subscription_tiers WHERE code = 'standard'
UNION ALL
SELECT id, 0.00, 'Premium all-inclusive, no shadow charge' FROM public.md_subscription_tiers WHERE code = 'premium';

-- ============================================================
-- 6. MD_MEMBERSHIP_TIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.md_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  fee_discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  commission_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 12.00,
  duration_months INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.md_membership_tiers (code, name, fee_discount_pct, commission_rate_pct, duration_months, display_order) VALUES
  ('annual', 'Annual Membership', 10.00, 8.00, 12, 1),
  ('multi_year', 'Multi-Year Membership', 15.00, 7.00, 24, 2);

-- ============================================================
-- 7. SEEKER_ORGANIZATION_AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seeker_organization_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tenant_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_org_audit_org_time ON public.seeker_organization_audit (organization_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_audit_tenant ON public.seeker_organization_audit (tenant_id);

-- ============================================================
-- 8. SEEKER_CHALLENGE_TOPUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.seeker_challenge_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  tenant_id UUID NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  per_challenge_fee DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','completed','failed','refunded')),
  stripe_payment_intent_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 9. ADD MISSING COLUMNS TO SEEKER_SUBSCRIPTIONS
-- ============================================================
ALTER TABLE public.seeker_subscriptions
  ADD COLUMN IF NOT EXISTS challenges_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_limit_snapshot INT NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS current_period_start DATE,
  ADD COLUMN IF NOT EXISTS current_period_end DATE,
  ADD COLUMN IF NOT EXISTS per_challenge_fee_snapshot DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_solutions_snapshot INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pending_downgrade_tier_id UUID REFERENCES public.md_subscription_tiers(id),
  ADD COLUMN IF NOT EXISTS pending_downgrade_date DATE,
  ADD COLUMN IF NOT EXISTS shadow_charge_per_challenge DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shadow_currency_code VARCHAR(3) DEFAULT 'INR';

-- ============================================================
-- 10. ADD MISSING COLUMNS TO CHALLENGES
-- ============================================================
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS engagement_model_id UUID REFERENCES public.md_engagement_models(id),
  ADD COLUMN IF NOT EXISTS complexity_id UUID REFERENCES public.md_challenge_complexity(id),
  ADD COLUMN IF NOT EXISTS consulting_fee DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS management_fee DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_fee DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shadow_fee_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_solutions INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS solutions_awarded INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';

-- ============================================================
-- 11. ENGAGEMENT MODEL LOCK TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_engagement_model_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'draft' AND NEW.engagement_model_id IS DISTINCT FROM OLD.engagement_model_id THEN
    RAISE EXCEPTION 'Engagement model cannot be changed after challenge leaves Draft status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_engagement_model_lock ON public.challenges;
CREATE TRIGGER trg_engagement_model_lock
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_engagement_model_lock();

-- ============================================================
-- 12. INDEXES
-- ============================================================
-- MD tables
CREATE INDEX IF NOT EXISTS idx_industries_active ON public.md_industries (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_complexity_active ON public.md_challenge_complexity (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_base_fees_country_tier ON public.md_challenge_base_fees (country_id, tier_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shadow_pricing_tier ON public.md_shadow_pricing (tier_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_active_statuses_blocking ON public.md_challenge_active_statuses (status_code) WHERE blocks_model_switch = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_membership_tiers_active ON public.md_membership_tiers (is_active, display_order);

-- Challenges extended indexes
CREATE INDEX IF NOT EXISTS idx_challenges_org_status ON public.challenges (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_challenges_engagement ON public.challenges (engagement_model_id);
CREATE INDEX IF NOT EXISTS idx_challenges_complexity ON public.challenges (complexity_id);
CREATE INDEX IF NOT EXISTS idx_challenges_created ON public.challenges (organization_id, created_at);

-- Topups
CREATE INDEX IF NOT EXISTS idx_topups_org_period ON public.seeker_challenge_topups (organization_id, billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_topups_tenant ON public.seeker_challenge_topups (tenant_id);

-- ============================================================
-- 13. RLS POLICIES
-- ============================================================

-- MD_INDUSTRIES
ALTER TABLE public.md_industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active industries" ON public.md_industries FOR SELECT USING (is_active = true);

-- MD_CHALLENGE_COMPLEXITY
ALTER TABLE public.md_challenge_complexity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active complexity" ON public.md_challenge_complexity FOR SELECT USING (is_active = true);

-- MD_CHALLENGE_BASE_FEES
ALTER TABLE public.md_challenge_base_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active base fees" ON public.md_challenge_base_fees FOR SELECT USING (is_active = true);

-- MD_CHALLENGE_ACTIVE_STATUSES
ALTER TABLE public.md_challenge_active_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active statuses" ON public.md_challenge_active_statuses FOR SELECT USING (is_active = true);

-- MD_SHADOW_PRICING
ALTER TABLE public.md_shadow_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active shadow pricing" ON public.md_shadow_pricing FOR SELECT USING (is_active = true);

-- MD_MEMBERSHIP_TIERS
ALTER TABLE public.md_membership_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active membership tiers" ON public.md_membership_tiers FOR SELECT USING (is_active = true);

-- SEEKER_ORGANIZATION_AUDIT
ALTER TABLE public.seeker_organization_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can view own audit" ON public.seeker_organization_audit FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Authenticated users can insert audit" ON public.seeker_organization_audit FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- SEEKER_CHALLENGE_TOPUPS
ALTER TABLE public.seeker_challenge_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can view own topups" ON public.seeker_challenge_topups FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant can create topups" ON public.seeker_challenge_topups FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
