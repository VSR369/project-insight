-- Seed Enterprise tier pricing as negotiable base rates (starting-from prices)
-- Enterprise tier ID: 7bf7f040-5d05-4c75-b26c-182cb4113c62
-- Same 4 countries as other tiers: US, UK, India, Brazil

INSERT INTO md_tier_country_pricing (tier_id, country_id, monthly_price_usd, local_price, currency_code, is_active)
VALUES
  -- United States
  ('7bf7f040-5d05-4c75-b26c-182cb4113c62', '5552f309-ecb1-441c-9be5-d4bdf687bd13', 999.00, 999.00, 'USD', true),
  -- United Kingdom
  ('7bf7f040-5d05-4c75-b26c-182cb4113c62', '7b6906f1-1c78-4e92-b282-6a1cd2067453', 999.00, 799.00, 'GBP', true),
  -- India
  ('7bf7f040-5d05-4c75-b26c-182cb4113c62', 'b386af94-4e21-4b78-9235-eb8c75c12016', 999.00, 49999.00, 'INR', true),
  -- Brazil
  ('7bf7f040-5d05-4c75-b26c-182cb4113c62', '09d18819-0d2c-4159-914d-754a2afa8e0b', 999.00, 4999.00, 'BRL', true)
ON CONFLICT DO NOTHING;