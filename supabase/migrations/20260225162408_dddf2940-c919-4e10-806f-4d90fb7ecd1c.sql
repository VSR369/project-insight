-- Migration 4: Insert OFAC-restricted countries and flag them
-- These countries don't exist in the DB yet, so INSERT them
INSERT INTO public.countries (name, code, iso_alpha3, is_ofac_restricted, is_active, currency_symbol, date_format, number_format, display_order)
VALUES
  ('North Korea', 'KP', 'PRK', true, false, '₩', 'YYYY-MM-DD', '#,###.##', 999),
  ('Iran', 'IR', 'IRN', true, false, '﷼', 'YYYY/MM/DD', '#,###.##', 998),
  ('Syria', 'SY', 'SYR', true, false, '£', 'DD/MM/YYYY', '#,###.##', 997),
  ('Cuba', 'CU', 'CUB', true, false, '₱', 'DD/MM/YYYY', '#,###.##', 996)
ON CONFLICT (code) DO UPDATE SET is_ofac_restricted = true, is_active = false;
