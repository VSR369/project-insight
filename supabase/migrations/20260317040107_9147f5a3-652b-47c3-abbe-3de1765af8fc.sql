
-- Seed 8 platform roles
INSERT INTO public.platform_roles (role_code, role_name, role_description, applicable_model)
VALUES
  ('AM', 'Account Manager', 'Manages client relationship and challenge intake for Marketplace model', 'MP'),
  ('RQ', 'Challenge Requestor', 'Submits challenge requests in Aggregator model', 'AGG'),
  ('CR', 'Challenge Creator/Architect', 'Designs and architects challenge specifications', 'BOTH'),
  ('CU', 'Challenge Curator', 'Reviews and curates challenge quality and compliance', 'BOTH'),
  ('ID', 'Innovation Director', 'Oversees innovation strategy and challenge portfolio', 'BOTH'),
  ('ER', 'Expert Reviewer', 'Provides domain expertise for challenge evaluation', 'BOTH'),
  ('LC', 'Legal Coordinator', 'Manages legal review, IP terms, and compliance', 'BOTH'),
  ('FC', 'Finance Coordinator', 'Manages budgets, payments, and financial governance', 'BOTH')
ON CONFLICT (role_code) DO NOTHING;

-- Seed 5 role conflict rules
INSERT INTO public.role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile)
VALUES
  ('CR', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY'),
  ('CR', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY'),
  ('CU', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY'),
  ('CR', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY'),
  ('ID', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY');
