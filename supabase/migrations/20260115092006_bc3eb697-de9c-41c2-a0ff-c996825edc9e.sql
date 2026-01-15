-- Delete all existing organization types
DELETE FROM organization_types;

-- Insert the 7 new organization types
INSERT INTO organization_types (code, name, description, display_order, is_active)
VALUES 
  ('CORPORATE', 'Corporate', 'Large established business entities', 1, true),
  ('STARTUP', 'Start-up', 'Early-stage innovative companies', 2, true),
  ('MSME', 'MSME', 'Micro, Small and Medium Enterprises', 3, true),
  ('COLLEGE', 'College', 'Higher education institutions', 4, true),
  ('SCHOOL', 'School', 'Primary and secondary education institutions', 5, true),
  ('NGO', 'NGO/ Non-Profit', 'Non-governmental and non-profit organizations', 6, true),
  ('GOVT', 'Government Entity', 'Government departments and public sector units', 7, true);