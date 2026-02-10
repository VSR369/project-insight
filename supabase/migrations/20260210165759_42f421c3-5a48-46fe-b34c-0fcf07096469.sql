
-- Seed: md_engagement_models (2 rows)
INSERT INTO public.md_engagement_models (code, name, description, display_order, is_active)
VALUES
  ('marketplace', 'Marketplace', 'Connect with vetted solution providers through an open marketplace', 1, true),
  ('aggregator', 'Aggregator', 'Curated expert panels assembled for your specific challenge', 2, true);

-- Seed: md_tier_features (24 rows)
INSERT INTO public.md_tier_features (tier_id, feature_name, feature_code, access_type, display_order)
VALUES
  ('e3338419-144f-4a21-9163-425283cf1862', 'Marketplace Access', 'marketplace_access', 'included', 1),
  ('e3338419-144f-4a21-9163-425283cf1862', 'Aggregator Access', 'aggregator_access', 'not_available', 2),
  ('e3338419-144f-4a21-9163-425283cf1862', 'Dedicated Account Manager', 'dedicated_account_manager', 'not_available', 3),
  ('e3338419-144f-4a21-9163-425283cf1862', 'Analytics Dashboard', 'analytics_dashboard', 'included', 4),
  ('e3338419-144f-4a21-9163-425283cf1862', 'API Access', 'api_access', 'not_available', 5),
  ('e3338419-144f-4a21-9163-425283cf1862', 'Priority Support', 'priority_support', 'not_available', 6),
  ('e3338419-144f-4a21-9163-425283cf1862', 'Custom Integrations', 'custom_integrations', 'not_available', 7),
  ('e3338419-144f-4a21-9163-425283cf1862', 'White-label Reports', 'whitelabel_reports', 'not_available', 8),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Marketplace Access', 'marketplace_access', 'included', 1),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Aggregator Access', 'aggregator_access', 'included', 2),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Dedicated Account Manager', 'dedicated_account_manager', 'not_available', 3),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Analytics Dashboard', 'analytics_dashboard', 'included', 4),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'API Access', 'api_access', 'included', 5),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Priority Support', 'priority_support', 'included', 6),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'Custom Integrations', 'custom_integrations', 'not_available', 7),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'White-label Reports', 'whitelabel_reports', 'not_available', 8),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Marketplace Access', 'marketplace_access', 'included', 1),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Aggregator Access', 'aggregator_access', 'included', 2),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Dedicated Account Manager', 'dedicated_account_manager', 'included', 3),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Analytics Dashboard', 'analytics_dashboard', 'included', 4),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'API Access', 'api_access', 'included', 5),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Priority Support', 'priority_support', 'included', 6),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'Custom Integrations', 'custom_integrations', 'included', 7),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'White-label Reports', 'whitelabel_reports', 'included', 8);

-- Seed: md_tier_country_pricing (12 rows)
INSERT INTO public.md_tier_country_pricing (tier_id, country_id, monthly_price_usd, currency_code, local_price, is_active)
VALUES
  ('e3338419-144f-4a21-9163-425283cf1862', '5552f309-ecb1-441c-9be5-d4bdf687bd13', 199, 'USD', 199, true),
  ('e3338419-144f-4a21-9163-425283cf1862', '7b6906f1-1c78-4e92-b282-6a1cd2067453', 199, 'GBP', 159, true),
  ('e3338419-144f-4a21-9163-425283cf1862', 'b386af94-4e21-4b78-9235-eb8c75c12016', 199, 'INR', 9999, true),
  ('e3338419-144f-4a21-9163-425283cf1862', '09d18819-0d2c-4159-914d-754a2afa8e0b', 199, 'BRL', 999, true),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', '5552f309-ecb1-441c-9be5-d4bdf687bd13', 299, 'USD', 299, true),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', '7b6906f1-1c78-4e92-b282-6a1cd2067453', 299, 'GBP', 239, true),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'b386af94-4e21-4b78-9235-eb8c75c12016', 299, 'INR', 14999, true),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', '09d18819-0d2c-4159-914d-754a2afa8e0b', 299, 'BRL', 1499, true),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', '5552f309-ecb1-441c-9be5-d4bdf687bd13', 399, 'USD', 399, true),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', '7b6906f1-1c78-4e92-b282-6a1cd2067453', 399, 'GBP', 319, true),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'b386af94-4e21-4b78-9235-eb8c75c12016', 399, 'INR', 19999, true),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', '09d18819-0d2c-4159-914d-754a2afa8e0b', 399, 'BRL', 1999, true);

-- Seed: md_tier_engagement_access (6 rows)
INSERT INTO public.md_tier_engagement_access (tier_id, engagement_model_id, access_type)
SELECT t.id, em.id, 
  CASE 
    WHEN t.code = 'basic' AND em.code = 'aggregator' THEN 'not_available'::access_type_enum
    ELSE 'included'::access_type_enum
  END
FROM md_subscription_tiers t
CROSS JOIN md_engagement_models em
WHERE t.code IN ('basic','standard','premium');

-- Seed: md_payment_methods_availability (36 rows)
INSERT INTO public.md_payment_methods_availability (country_id, tier_id, payment_method, is_active)
VALUES
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'e3338419-144f-4a21-9163-425283cf1862', 'credit_card'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'e3338419-144f-4a21-9163-425283cf1862', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'e3338419-144f-4a21-9163-425283cf1862', 'wire_transfer'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'credit_card'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'wire_transfer'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'credit_card'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('5552f309-ecb1-441c-9be5-d4bdf687bd13', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'wire_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'e3338419-144f-4a21-9163-425283cf1862', 'credit_card'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'e3338419-144f-4a21-9163-425283cf1862', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'e3338419-144f-4a21-9163-425283cf1862', 'wire_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'credit_card'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'wire_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'credit_card'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('7b6906f1-1c78-4e92-b282-6a1cd2067453', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'wire_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'e3338419-144f-4a21-9163-425283cf1862', 'credit_card'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'e3338419-144f-4a21-9163-425283cf1862', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'e3338419-144f-4a21-9163-425283cf1862', 'wire_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'credit_card'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'wire_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'credit_card'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('b386af94-4e21-4b78-9235-eb8c75c12016', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'wire_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'e3338419-144f-4a21-9163-425283cf1862', 'credit_card'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'e3338419-144f-4a21-9163-425283cf1862', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'e3338419-144f-4a21-9163-425283cf1862', 'wire_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'credit_card'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', 'f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'wire_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'credit_card'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'ach_bank_transfer'::payment_method_type_enum, true),
  ('09d18819-0d2c-4159-914d-754a2afa8e0b', '41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'wire_transfer'::payment_method_type_enum, true);

-- Seed: platform_terms (1 row)
INSERT INTO public.platform_terms (version, title, content, effective_date, is_active)
VALUES (
  '1.0',
  'Platform Terms of Service',
  'These are the platform terms of service for testing purposes. By using this platform, you agree to comply with all applicable laws and regulations. This is placeholder content that will be replaced with actual legal terms before production launch.',
  NOW()::date,
  true
);
