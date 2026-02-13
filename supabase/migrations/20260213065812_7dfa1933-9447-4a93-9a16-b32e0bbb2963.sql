
-- ============================================
-- Part 1A: Create md_platform_fees table
-- ============================================
CREATE TABLE public.md_platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_model_id UUID NOT NULL REFERENCES public.md_engagement_models(id),
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  platform_fee_pct NUMERIC(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(engagement_model_id, tier_id)
);

-- Indexes
CREATE INDEX idx_platform_fees_engagement_model ON public.md_platform_fees(engagement_model_id);
CREATE INDEX idx_platform_fees_tier ON public.md_platform_fees(tier_id);

-- Enable RLS
ALTER TABLE public.md_platform_fees ENABLE ROW LEVEL SECURITY;

-- RLS: Platform admin read
CREATE POLICY "Platform admins can read platform fees"
ON public.md_platform_fees FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS: Platform admin insert
CREATE POLICY "Platform admins can insert platform fees"
ON public.md_platform_fees FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS: Platform admin update
CREATE POLICY "Platform admins can update platform fees"
ON public.md_platform_fees FOR UPDATE
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS: Platform admin delete
CREATE POLICY "Platform admins can delete platform fees"
ON public.md_platform_fees FOR DELETE
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- ============================================
-- Part 1B: Add engagement_model_id to md_challenge_base_fees
-- ============================================
ALTER TABLE public.md_challenge_base_fees
ADD COLUMN engagement_model_id UUID REFERENCES public.md_engagement_models(id);

CREATE INDEX idx_base_fees_engagement_model ON public.md_challenge_base_fees(engagement_model_id);

-- ============================================
-- Part 1C: Update Aggregator + Basic access to 'included'
-- ============================================
UPDATE public.md_tier_engagement_access
SET access_type = 'included'
WHERE id = 'f7049969-c159-47cc-96b7-957ff28d6a25';
