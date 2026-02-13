
-- Add country_id and currency_code to md_platform_fees
ALTER TABLE md_platform_fees
  ADD COLUMN country_id UUID REFERENCES countries(id),
  ADD COLUMN currency_code VARCHAR(5) NOT NULL DEFAULT 'USD';

CREATE INDEX idx_platform_fees_country ON md_platform_fees(country_id);

-- Add country_id to md_shadow_pricing
ALTER TABLE md_shadow_pricing
  ADD COLUMN country_id UUID REFERENCES countries(id);

CREATE INDEX idx_shadow_pricing_country ON md_shadow_pricing(country_id);
