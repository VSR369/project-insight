
INSERT INTO md_mpa_config (param_key, param_value, description, param_type, param_group, label, unit, min_value, max_value, is_critical, requires_restart)
VALUES
  ('basic_admin_max_industries', '3', 'Maximum number of industry segments a Basic Admin can be assigned', 'INTEGER', 'EXPERTISE_CAPS', 'Max Industries (Basic Admin)', NULL, '1', '20', false, false),
  ('basic_admin_max_countries', '3', 'Maximum number of countries a Basic Admin can be assigned', 'INTEGER', 'EXPERTISE_CAPS', 'Max Countries (Basic Admin)', NULL, '1', '20', false, false),
  ('basic_admin_max_org_types', '3', 'Maximum number of organization types a Basic Admin can be assigned', 'INTEGER', 'EXPERTISE_CAPS', 'Max Org Types (Basic Admin)', NULL, '1', '20', false, false);
