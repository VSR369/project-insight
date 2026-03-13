-- Seed 6 new permission keys for Org Approvals and Marketplace
-- across all 3 admin tiers (admin, senior_admin, supervisor)

INSERT INTO tier_permissions (tier, permission_key, is_enabled)
VALUES
  -- org_approvals.view — ALL tiers enabled
  ('admin', 'org_approvals.view', true),
  ('senior_admin', 'org_approvals.view', true),
  ('supervisor', 'org_approvals.view', true),
  -- org_approvals.approve_reject — ALL tiers enabled
  ('admin', 'org_approvals.approve_reject', true),
  ('senior_admin', 'org_approvals.approve_reject', true),
  ('supervisor', 'org_approvals.approve_reject', true),
  -- marketplace.view — ALL tiers enabled
  ('admin', 'marketplace.view', true),
  ('senior_admin', 'marketplace.view', true),
  ('supervisor', 'marketplace.view', true),
  -- marketplace.assign_members — ALL tiers enabled
  ('admin', 'marketplace.assign_members', true),
  ('senior_admin', 'marketplace.assign_members', true),
  ('supervisor', 'marketplace.assign_members', true),
  -- marketplace.manage_pool — senior_admin+ only
  ('admin', 'marketplace.manage_pool', false),
  ('senior_admin', 'marketplace.manage_pool', true),
  ('supervisor', 'marketplace.manage_pool', true),
  -- marketplace.manage_config — senior_admin+ only
  ('admin', 'marketplace.manage_config', false),
  ('senior_admin', 'marketplace.manage_config', true),
  ('supervisor', 'marketplace.manage_config', true)
ON CONFLICT DO NOTHING;