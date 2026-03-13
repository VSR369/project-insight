INSERT INTO tier_permissions (tier, permission_key, is_enabled) VALUES
  ('supervisor','supervisor.manage_permissions',true),
  ('senior_admin','supervisor.manage_permissions',false),
  ('admin','supervisor.manage_permissions',false),
  ('supervisor','org_approvals.manage_agreements',true),
  ('senior_admin','org_approvals.manage_agreements',true),
  ('admin','org_approvals.manage_agreements',false),
  ('supervisor','admin_management.view_settings',true),
  ('senior_admin','admin_management.view_settings',true),
  ('admin','admin_management.view_settings',false),
  ('supervisor','seeker_config.edit_pricing',true),
  ('senior_admin','seeker_config.edit_pricing',false),
  ('admin','seeker_config.edit_pricing',false)
ON CONFLICT DO NOTHING;