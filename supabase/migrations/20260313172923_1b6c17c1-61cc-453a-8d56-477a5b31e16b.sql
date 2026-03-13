INSERT INTO tier_permissions (tier, permission_key, is_enabled) VALUES
  ('supervisor','seeker_config.view_shadow_pricing',true),
  ('senior_admin','seeker_config.view_shadow_pricing',false),
  ('admin','seeker_config.view_shadow_pricing',false)
ON CONFLICT DO NOTHING;