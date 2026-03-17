
-- Seed test data for 5 DB-dependent M-11 test items

-- 1. Update test org: tier limit testing (max_concurrent_active = 3)
UPDATE seeker_organizations 
SET max_concurrent_active = 3, subscription_tier = 'Starter'
WHERE id = '48c85c00-42e9-41c6-b90e-c7fc62e9f451';

-- 2. Insert R3 role assignment for architect dropdown
INSERT INTO role_assignments (user_id, org_id, role_code, status, user_name, user_email)
VALUES (
  'b8439f11-93eb-4d10-b8f7-4da1505ef621',
  '48c85c00-42e9-41c6-b90e-c7fc62e9f451',
  'R3',
  'active',
  'Primary OrgAdmin',
  'soadmin@test.local'
)
ON CONFLICT DO NOTHING;

-- 3. Insert sample challenges for duplicate detection testing
INSERT INTO challenges (tenant_id, organization_id, title, problem_statement, operating_model, status, master_status, current_phase, created_by, is_active, is_deleted, governance_profile)
VALUES 
  ('48c85c00-42e9-41c6-b90e-c7fc62e9f451', '48c85c00-42e9-41c6-b90e-c7fc62e9f451', 'AI-Powered Supply Chain Optimization', 'We need to optimize our supply chain using AI and machine learning to reduce costs and improve delivery times across our global distribution network.', 'MP', 'draft', 'DRAFT', 1, 'b8439f11-93eb-4d10-b8f7-4da1505ef621', true, false, 'LIGHTWEIGHT'),
  ('48c85c00-42e9-41c6-b90e-c7fc62e9f451', '48c85c00-42e9-41c6-b90e-c7fc62e9f451', 'Customer Retention Analytics Platform', 'Build a customer retention analytics platform that predicts churn risk and recommends personalized engagement strategies for our SaaS customer base.', 'MP', 'draft', 'DRAFT', 1, 'b8439f11-93eb-4d10-b8f7-4da1505ef621', true, false, 'LIGHTWEIGHT'),
  ('48c85c00-42e9-41c6-b90e-c7fc62e9f451', '48c85c00-42e9-41c6-b90e-c7fc62e9f451', 'Sustainable Energy Dashboard', 'Design and implement a real-time energy consumption dashboard that tracks sustainability metrics and carbon footprint reduction across all facilities.', 'MP', 'draft', 'ACTIVE', 2, 'b8439f11-93eb-4d10-b8f7-4da1505ef621', true, false, 'LIGHTWEIGHT');
