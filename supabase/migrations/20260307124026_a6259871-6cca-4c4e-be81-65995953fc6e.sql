
-- Seed industry tags for MOD-03 test orgs
INSERT INTO public.seeker_org_industries (organization_id, tenant_id, industry_id, is_primary) VALUES
  ('48c85c00-42e9-41c6-b90e-c7fc62e9f451', '48c85c00-42e9-41c6-b90e-c7fc62e9f451', 'ffb4ba70-affe-4558-853d-3a1b27444210', true),
  ('48c85c00-42e9-41c6-b90e-c7fc62e9f451', '48c85c00-42e9-41c6-b90e-c7fc62e9f451', '853821a3-5c45-42cf-b035-3f8609e025dc', false),
  ('9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb', '9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb', 'b1a248ce-15b9-4733-a035-a904a786fe30', true),
  ('9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb', '9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb', '357558fe-56d0-4bb7-a6f8-21d5ac109fc6', false),
  ('cfe4c3f0-4af1-418e-8006-0c19e5efb7e2', 'cfe4c3f0-4af1-418e-8006-0c19e5efb7e2', '41ee5438-f270-488c-aae1-b46c120bc276', true),
  ('6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', '6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', 'a333531e-8a60-4682-87df-a9fdc617a232', true),
  ('6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', '6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', '70ef723b-381e-488e-9aa8-628af68dac10', false),
  ('6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', '6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', '297e445b-4583-49b8-a0ec-d0916b50b977', false),
  ('b144870a-9989-41ca-8186-7d3dbf6b5af5', 'b144870a-9989-41ca-8186-7d3dbf6b5af5', '07ec4ff5-4e92-45e4-b949-2f38683f537b', true),
  ('b144870a-9989-41ca-8186-7d3dbf6b5af5', 'b144870a-9989-41ca-8186-7d3dbf6b5af5', 'ffb4ba70-affe-4558-853d-3a1b27444210', false),
  ('5fd3002f-01cf-4203-8124-7224760d698a', '5fd3002f-01cf-4203-8124-7224760d698a', '853821a3-5c45-42cf-b035-3f8609e025dc', true),
  ('5fd3002f-01cf-4203-8124-7224760d698a', '5fd3002f-01cf-4203-8124-7224760d698a', '357558fe-56d0-4bb7-a6f8-21d5ac109fc6', false),
  ('308a8374-b604-4596-9254-65daa490ffb9', '308a8374-b604-4596-9254-65daa490ffb9', 'a333531e-8a60-4682-87df-a9fdc617a232', true),
  ('9710a4a1-6c06-472a-8d55-ed8921ea352f', '9710a4a1-6c06-472a-8d55-ed8921ea352f', '41ee5438-f270-488c-aae1-b46c120bc276', true),
  ('9710a4a1-6c06-472a-8d55-ed8921ea352f', '9710a4a1-6c06-472a-8d55-ed8921ea352f', '07ec4ff5-4e92-45e4-b949-2f38683f537b', false),
  ('9710a4a1-6c06-472a-8d55-ed8921ea352f', '9710a4a1-6c06-472a-8d55-ed8921ea352f', '70ef723b-381e-488e-9aa8-628af68dac10', false)
ON CONFLICT (organization_id, industry_id) DO NOTHING;
