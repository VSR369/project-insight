-- Performance indexes for fee tables
CREATE INDEX IF NOT EXISTS idx_base_fees_country_tier_model ON md_challenge_base_fees(country_id, tier_id, engagement_model_id);
CREATE INDEX IF NOT EXISTS idx_base_fees_active ON md_challenge_base_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_fees_country_tier_model ON md_platform_fees(country_id, tier_id, engagement_model_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_active ON md_platform_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_shadow_pricing_country_tier ON md_shadow_pricing(country_id, tier_id);
CREATE INDEX IF NOT EXISTS idx_shadow_pricing_active ON md_shadow_pricing(is_active);