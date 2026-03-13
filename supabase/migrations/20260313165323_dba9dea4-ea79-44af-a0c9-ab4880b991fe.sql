INSERT INTO tier_permissions (tier, permission_key, is_enabled)
VALUES
  ('supervisor', 'master_data.view', true),
  ('supervisor', 'master_data.create', true),
  ('supervisor', 'master_data.edit', true),
  ('supervisor', 'master_data.deactivate', true),
  ('supervisor', 'master_data.delete', true),
  ('senior_admin', 'master_data.view', true),
  ('senior_admin', 'master_data.create', true),
  ('senior_admin', 'master_data.edit', true),
  ('senior_admin', 'master_data.deactivate', false),
  ('senior_admin', 'master_data.delete', false),
  ('admin', 'master_data.view', true),
  ('admin', 'master_data.create', false),
  ('admin', 'master_data.edit', false),
  ('admin', 'master_data.deactivate', false),
  ('admin', 'master_data.delete', false)
ON CONFLICT DO NOTHING;