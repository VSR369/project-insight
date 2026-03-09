
INSERT INTO md_mpa_config (param_key, param_value, description, param_type, param_group, label, unit, min_value, max_value, is_critical, requires_restart)
VALUES
  ('platform_admin_tier_depth', '3', 'Number of active platform admin tiers. 1=Supervisor only, 2=Supervisor+Senior Admin, 3=Full hierarchy (Supervisor+Senior Admin+Admin)', 'INTEGER', 'governance', 'Platform Admin Tier Depth', NULL, '1', '3', true, false),
  ('org_admin_delegation_enabled', 'true', 'Enable delegated admin creation for seeker organizations. When false, only PRIMARY admins exist.', 'BOOLEAN', 'governance', 'Org Admin Delegation', NULL, NULL, NULL, true, false);
