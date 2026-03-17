
-- T01-03: Expand conflict_type CHECK to include ENTERPRISE_ONLY
ALTER TABLE public.role_conflict_rules
  DROP CONSTRAINT role_conflict_rules_conflict_type_check;

ALTER TABLE public.role_conflict_rules
  ADD CONSTRAINT role_conflict_rules_conflict_type_check
  CHECK (conflict_type IN ('HARD_BLOCK', 'SOFT_WARN', 'ALLOWED', 'ENTERPRISE_ONLY'));

-- Seed ENTERPRISE_ONLY conflict type rules
INSERT INTO role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile, is_active)
VALUES
  ('AM', 'ER', 'ENTERPRISE_ONLY', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY', true),
  ('AM', 'LC', 'ENTERPRISE_ONLY', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY', true),
  ('RQ', 'FC', 'ENTERPRISE_ONLY', 'SAME_CHALLENGE', 'ENTERPRISE_ONLY', true);
