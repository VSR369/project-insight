
-- Seed: 4 new pool members for testing Solution Requests assignment
INSERT INTO platform_provider_pool (full_name, email, role_codes, availability_status, max_concurrent)
VALUES
  ('Priya Sharma', 'priya.sharma@test.example.com', ARRAY['R3','R5_MP','R7_MP'], 'available', 3),
  ('Rajesh Kumar', 'rajesh.kumar@test.example.com', ARRAY['R6_MP','R7_MP'], 'available', 3),
  ('Anita Desai', 'anita.desai@test.example.com', ARRAY['R3','R5_MP','R6_MP'], 'available', 3),
  ('Mark Thompson', 'mark.thompson@test.example.com', ARRAY['R7_MP','R5_MP'], 'available', 3);

-- Seed: 1 new marketplace challenge for "Pending Assignment" testing
INSERT INTO challenges (title, organization_id, tenant_id, engagement_model_id, status, is_active, is_deleted)
VALUES (
  'Digital Literacy Program for Rural Communities',
  '3ebb4c6e-0b38-4844-aa0a-1923b5d06fd3',
  '3ebb4c6e-0b38-4844-aa0a-1923b5d06fd3',
  'ae032091-3806-4021-b89f-0ac8a51f90b8',
  'active',
  true,
  false
);
